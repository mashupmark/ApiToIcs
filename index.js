const { writeFileSync } = require('fs')
const ics = require('ics')
 
ics.createEvent({
  title: 'Test',
  description: 'Ein Test Event',
  start: [2019, 9, 8, 18, 0],
  startInputType: "local",
  duration: { minutes: 60 }
}, (error, value) => {
  if (error) {
    console.log(error)
  }
 
  console.log(value)
  writeFileSync(`${__dirname}/event.ics`, value)
})