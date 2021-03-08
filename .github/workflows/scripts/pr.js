console.log('NODE Action running...');

const event = require(process.env.GITHUB_EVENT_PATH);

console.log(event);

console.log('Process finished');