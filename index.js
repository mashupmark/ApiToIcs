const { writeFileSync } = require('fs')
const ics = require('ics')
const moment = require('moment')
const getJson = require('get-json')

getJson('https://stuv-mosbach.de/survival/api.php?action=getLectures&course=INF18B')
  .then(function(response) {

    var events = response.filter(function(event) {
      return event.over === false && event.name !== "Studientag";
    });

    var entries = [];
    events.forEach(function(event) {
      var startDate = event.start_date.split('.');
      var startTime = event.start_time.split(':');

      var entry = {
        title: event.name,
        start: [Number(startDate[2]), Number(startDate[1]), Number(startDate[0]), Number(startTime[0]), Number(startTime[1])],
        duration: { minutes: event.duration },
        location: event.location,
        organizer: { name: (event.lecturer === null || event.lecturer === '') ? 'unbekannt' : event.lecturer }
      }

      entries.push(entry);
    });

    ics.createEvents(entries, (error, value) => {
      if (error) {
        console.log(error)
      }
    });

    push(entries);
    console.log(entries);
  }).catch(function(error) {
    console.log(error);
  });

function push(value) {
  writeFileSync(`${__dirname}/events.ics`, value)

  console.log("Pushing to GitHub...");

  require('simple-git')()
    .add("./events.ics")
    .commit("Update " + moment().format('YYYY-MM-DD:hh:mm:ss'))
    .push(['-u', 'origin', 'master'], () => console.log("Done"));
}
