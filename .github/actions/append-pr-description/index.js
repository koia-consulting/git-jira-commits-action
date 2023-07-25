const core = require('@actions/core');
const github = require('@actions/github');

// function removeSpecificText(str, startString, endString) {
//     var regex = new RegExp(startString + '.*?' + endString, 'g');
//     var result = str.replace(regex, '');
//
//     return result;
// }

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

        const commentsResponse = await octokit.rest.issues.listComments({
            owner: repo.owner,
            repo: repo.repo,
            issue_number: pullRequest.number,
        });

        core.notice(commentsResponse.data);

        for(let comment of commentsResponse.data){
            core.notice(comment);
        }

        const markerStart = '### JIRA Tickets in PR \n';
        const markerEnd = '\n';

        let comment = markerStart;
        comment += issuesInfo;
        comment += markerEnd;

        await octokit.rest.issues.createComment({
            owner: repo.owner,
            repo: repo.repo,
            issue_number: pullRequest.number,
            body: comment,
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
