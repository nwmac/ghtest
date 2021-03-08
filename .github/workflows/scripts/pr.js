console.log('NODE Action running...');

const event = require(process.env.GITHUB_EVENT_PATH);

console.log(JSON.stringify(event, null, 2));


const body = event.pull_request.body;

console.log('body is');
console.log(body);


console.log('-----');
console.log('Process finished');
