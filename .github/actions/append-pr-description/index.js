const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const issuesInfo = process.env.ISSUES_INFO;
        const { repo, issue: { number: issue_number } } = github.context;

        const octokit = github.getOctokit(token);

        const { data: pullRequest } = await octokit.pulls.get({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: issue_number
        });

        let body = pullRequest.body;
        if (body === null) {
            body = '';
        }

        body += '\n---\n';
        body += '### JIRA Tickets in PR\n';
        body += issuesInfo;

        await octokit.pulls.update({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: issue_number,
            body: body
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();


run();
