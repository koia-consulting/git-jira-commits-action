const core = require('@actions/core');
const github = require('@actions/github');

function removeSpecificText(str, startString, endString) {
    // This will create a regex pattern like /startString.*?endString/g
    var regex = new RegExp(startString + '.*?' + endString, 'g');

    // Replace the matches with empty string
    var result = str.replace(regex, '');

    return result;
}

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

        const markerStart = '\n-----\n### JIRA Tickets in PR \n';
        const markerEnd = '\n-----\n';

        let body = removeSpecificText(pullRequest.body, markerStart, markerEnd);
        if (body === null) {
            body = '';
        }

        body += markerStart;
        body += issuesInfo;
        body += markerEnd;

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
