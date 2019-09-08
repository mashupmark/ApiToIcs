const { writeFileSync } = require('fs')
const ics = require('ics')
const moment = require('moment')
 
ics.createEvents([{
  title: 'Test',
  description: 'Ein Test Event',
  start: [2019, 9, 8, 18, 0],
  startInputType: "local",
  duration: { minutes: 60 }
},
{
    title: 'Test2',
    description: 'Ein weiteres Test Event',
    start: [2019, 9, 8, 20, 0],
    startInputType: "local",
    alarms: [],
    duration: { minutes: 30 }
  }
], (error, value) => {
  if (error) {
    console.log(error)
  }
 
  console.log(value)
  writeFileSync(`${__dirname}/events.ics`, value)

  console.log("Pushing to GitHub...");
  
  require('simple-git')()
    .add("./events.ics")
    .commit("Update " + moment().format('YYYY-MM-DD:hh:mm:ss'))
    .push(['-u', 'origin', 'master'], () => console.log("Done"));
})