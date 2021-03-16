#!/usr/bin/env node

const request = require('./request');

const IN_REVIEW_LABEL = '[zube]: Review';
const IN_TEST_LABEL = '[zube]: To Test';

// The event object
const event = require(process.env.GITHUB_EVENT_PATH);

function getReferencedIssues(body) {
    // https://docs.github.com/en/github/managing-your-work-on-github/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword
    const regexp = /[Ff]ix(es|ed)?\s*#([0-9]*)|[Cc]lose(s|d)?\s*#([0-9]*)|[Rr]esolve(s|d)?\s*#([0-9]*)/g;
    var v;
    const issues = [];
    do {
        v = regexp.exec(body);
        if (v) {
            issues.push(parseInt(v[2], 10));
        }
    } while (v);
    return issues;
}

function hasLabel(issue, label) {
    const found = issue.labels.find(l =>l.name.toLowerCase() === label.toLowerCase());
    return !!found;
}

function removeZubeLabels(labels) {
    return labels.filter(l => l.name.indexOf('[zube]') === -1);
}

async function resetZubeLabels(issue, label) {
    // Remove all zube labels
    const cleanLabels = removeZubeLabels(issue.labels);
    console.log(`    Current Labels: ${cleanLabels}`);
    // Add the 'to test' label
    cleanLabels.push(label);
    console.log(`    New Labels    : ${cleanLabels}`);

    // Update the labels
    const labelsAPI = `${issue.repository.url}/issues/${issue.number}/labels`;
    request.put(labelsAPI, {labels: cleanLabels});
}

async function processClosedAction() {
    const pr = event.pull_request;
    const body = pr.body;

    console.log('======');
    console.log('Processing Closed PR #' + pr.number + ' : ' + pr.title);
    console.log('======');

    // Check that the issue was merged and not just closed
    if (!pr.merged) {
        console.log( '  PR was closed without merging - ignoring');
        return;
    }

    const issues = getReferencedIssues(body);
    if (issues.length > 0) {
        console.log('  This PR fixes issues: ' + issues.join(', '));
    } else {
        console.log("  This PR does not fix any issues");
        return;
    }

    // Need to get all open PRs to see if any other references the same issues that this PR says it fixes
    const openPRs = event.repository.url + '/pulls?state=open&per_page=100';
    const r = await request.fetch(openPRs);
    const issueMap = issues.reduce((prev, issue) => { prev[issue] = true; return prev; }, {})

    // Go through all of the Open PRs and see if they fix any of the same issues that this PR does
    // If not, then the issue has been completed, so we can process it
    r.forEach(openPR => {
        const fixed = getReferencedIssues(openPR.body);
        fixed.forEach(issue => issueMap[issue] = false);
    });

    // Filter down the list of issues that should be closed because this PR was merged
    const fixed = Object.keys(issueMap).filter(key => !!issueMap[key]);
    console.log('');

    Object.keys(issueMap).forEach(k => {
        if (!issueMap[k]) {
            console.log(`  Issue #${k} will be ignored as another open PR also states that it fixes this issue`);
        }
    })

    // GitHub will do the closing, so we expect each issue to already be closed
    // We will fetch each issue in turn, expecting it to be closed
    // We will re-open the issue and label it as ready to test
    fixed.forEach(async(i) => {
        const detail = event.repository.url + '/issues/' + i;
        const iss = await request.fetch(detail);
        console.log('')
        console.log('Processing Issue #' + i + ' - ' + iss.title);
        console.log('  Updating labels to move issue to Test');

        resetZubeLabels(iss, IN_TEST_LABEL);

        // Re-open the issue if it is closed
        if (iss.state === 'closed') {
            console.log('  Re-opening issue');
            request.patch(detail, { state: 'open' });
        } else {
            console.log('  Expecting issue to be closed, but it is not');
        }
        console.log('');
    });
}

async function processOpenAction() {
    const pr = event.pull_request;

    // Check that an assignee has been set
    if (pr.assignees.length === 0) {
        console.log('======');
        console.log('Processing Opened PR #' + pr.number + ' : ' + pr.title);
        console.log('======');

        console.log(`  Adding assignee to the PR: ${pr.user.login}`);

        // Update the assignees
        const assigneesAPI = `${event.repository.url}/issues/${pr.number}/assignees`;
        request.post(assigneesAPI, {assignees: [pr.user.login]});
    }
}

async function processOpenOrEditAction() {
    console.log('======');
    console.log('Processing Opened/Edited PR #' + event.pull_request.number + ' : ' + event.pull_request.title);
    console.log('======');

    const body = event.pull_request.body;
    const issues = getReferencedIssues(body);
    if (issues.length > 0) {
        console.log('  This PR fixes issues: ' + issues.join(', '));
    } else {
        console.log("  This PR does not fix any issues");
    }

    issues.forEach(async(i) => {
        const detail = `${event.repository.url}/issues/${i}`;
        const iss = await request.fetch(detail);
        console.log('')
        console.log('Processing Issue #' + i + ' - ' + iss.title);

        if (!hasLabel(iss, IN_REVIEW_LABEL)) {
            // Add the In Review label to the issue as it does not have it
            resetZubeLabels(iss, IN_REVIEW_LABEL);
        } else {
            console.log('    Issues already has the In Review label');
        }
    });
}

// Debugging
console.log(JSON.stringify(event, null, 2));

// Look at the action
if (event.action === 'opened') {
    processOpenAction();
    processOpenOrEditAction();
} else if (event.action === 'edited') {
    processOpenOrEditAction();
} else if (event.action === 'closed') {
    processClosedAction();
}
