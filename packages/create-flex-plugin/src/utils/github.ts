import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

export interface GitHubInfo {
    owner: string;
    repo: string;
    ref: string;
}

export enum GitHubContentType {
    File = 'file',
    Dir = 'dir'
}

export interface GitHubContent {
    name: string;
    path: string;
    sha: string;
    size: number,
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: GitHubContentType;
    _links: {
        self: string;
        git: string;
        html: string;
    };
}

/**
 * Parses the GitHub URL to extract owner and repo information
 *
 * @param url {string}  the GitHub URL
 * @return returns the {@link GitHubInfo}
 */
export const parseGitHubUrl = (url: string): GitHubInfo => {
    const matches = url.match(/github\.com\/([0-9a-zA-Z-_]+)\/([0-9a-zA-Z-_]+)(\/tree\/([0-9a-zA-Z._-]+))?/);

    if (!matches || matches.length < 3) {
        throw new Error('Could not get owner and repo name from GitHub URL');
    }

    return {
        owner: matches[1],
        repo: matches[2],
        ref: matches[4] || 'master'
    }
};

/**
 * Downloads the repo to the provided directory path
 *
 * @param info {GitHubInfo} the GitHub information
 * @param dir {string}      the directory to download the content to
 * @return null
 */
export const downloadRepo = async (info: GitHubInfo, dir: string) => {
    const url = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/template?ref=${info.ref}`;

    return _downloadDir(url, dir);
};

/**
 * Recursively downloads the directory
 *
 * @param url {string}  the url to download
 * @param dir {string}  the path to the directory to save the content
 * @private
 */
export const _downloadDir = async (url: string, dir: string): Promise<null> => {
    return axios.get<Array<GitHubContent>>(url)
        .then(resp => resp.data)
        .then(contents => {
            const promises = contents.map(content => {
                if (content.type === GitHubContentType.Dir) {
                    return _downloadDir(content.url, dir);
                }

                const relativePath = content.download_url.match(/\/template\/(.+)\??/);
                if (!relativePath || relativePath.length !== 2) {
                    throw new Error('Received invalid URL template');
                }
                const output = path.resolve(dir, relativePath[1]);

                return _downloadFile(content.download_url, output);
            });

            return Promise.all(promises);
        })
        .then(() => null);
};

/**
 * Downloads the file
 *
 * @param url {string}      the url of the file to download
 * @param output {string}   the output path
 * @private
 */
export const _downloadFile = async (url: string, output: string) => {
    const config = {
        url,
        responseType: 'arraybuffer',
        method: 'get'
    };

    const dir = path.dirname(output);
    await mkdirp.sync(dir);

    return axios.request(config)
        .then(result => fs.writeFileSync(output, result.data));
};
