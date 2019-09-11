const {
  writeFileSync
} = require('fs')
const ics = require('ics')
const moment = require('moment')
const getJson = require('get-json')

require('simple-git')()
  .pull();

getJson('https://stuv-mosbach.de/survival/api.php?action=getLectures&course=INF18B')
  .then(function (response) {

    var events = response.filter(function (event) {
      return event.over === false && event.name !== "Studientag";
    });

    var entries = [];
    events.forEach(function (event) {
      var startDate = event.start_date.split('.');
      var startTime = event.start_time.split(':');

      var entry = {
        title: event.name,
        start: [Number(startDate[2]), Number(startDate[1]), Number(startDate[0]), Number(startTime[0]), Number(startTime[1])],
        duration: {
          minutes: event.duration
        },
        location: event.location,
        description: (event.lecturer === null || event.lecturer === '') ? 'Tutor: unbekannt' : 'Tutor: ' + event.lecturer
      }
      entries.push(entry);
    });

    for (let i = 1; i < entries.length; i++) {
      const last = entries[i - 1];
      const current = entries[i];

      if (last.title === current.title &&
        last.duration.minutes === current.duration.minutes &&
        last.start[0] === current.start[0] &&
        last.start[1] === current.start[1] &&
        last.start[2] === current.start[2] &&
        last.start[3] === current.start[3] &&
        last.start[4] === current.start[4]) {
          entries[i-1].location = entries[i-1].location + "; " + current.location;
          entries.splice(i, 1);
          i--;
        }
    }

    ics.createEvents(entries, (error, value) => {
      if (error) {
        console.log(error)
      }
      
      push(value);
    });
  }).catch(function (error) {
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