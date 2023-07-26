const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        // Get the GitHub token from the input
        const token = core.getInput('github-token', { required: true });
        const filter = core.getInput('filter');

        // Get the payload from the GitHub event
        const { payload } = github.context;
        const octokit = github.getOctokit(token);

        // Extract the JIRA keys from the PR/commit/branch based on the filter value
        let jiraKeys = [];
        const regex = /(?<=\/|\b)[a-z0-9]{1,10}-\d+\b/gi;

        // Extract JIRA keys from PR title
        if (filter === 'all' || filter === 'pr') {
            const prTitle = payload.pull_request?.title;
            const foundKeys = prTitle?.match(regex);
            if (foundKeys) {
                jiraKeys.push(...foundKeys);
            }
        }

        // Extract the JIRA keys from the branch name
        if (filter === 'all' || filter === 'branch') {
            const branchName = payload.pull_request?.head?.ref;
            const foundKeys = branchName?.match(regex);
            if (foundKeys) {
                jiraKeys.push(...foundKeys);
            }
        }

        // Extract JIRA keys from commit messages
        if (filter === 'all' || filter === 'commit') {
            const commits = await octokit.pulls.listCommits({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                pull_number: payload.pull_request.number,
            });

            for (const commit of commits.data) {
                const foundKeys = commit.commit.message.match(regex);
                if (foundKeys) {
                    jiraKeys.push(...foundKeys);
                }
            }
        }

        // Convert all JIRA keys to uppercase and remove duplicates
        jiraKeys = [...new Set(jiraKeys.map(key => key.toUpperCase()))];

        // Set the output
        core.notice(`Found JIRA keys: ${jiraKeys.join(', ')}`);
        core.setOutput('jira-keys', jiraKeys.join(','));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
