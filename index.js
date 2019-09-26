const { writeFileSync } = require('fs')
const ics = require('ics')
const moment = require('moment')
const getJson = require('get-json')
const crawler = require('crawler-request')

getJson('https://stuv-mosbach.de/survival/api.php?action=getLectures&course=INF18B')
  .then(async function (response) {

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
        entries[i - 1].location = entries[i - 1].location + "; " + current.location;
        entries.splice(i, 1);
        i--;
      }
    }

    let meals = await getMeals();
    addMeals(meals, entries);
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

async function getMeals() {
  var meals = new Array(5);

  meals = await crawler("https://www.studentenwerk.uni-heidelberg.de/sites/default/files/download/pdf/sp-mos-mensa-aktuell.pdf").then(function (response) {

    var chars = response.text.split('\n');

    for (let index = 0; index < chars.length; index++) {
      const element = chars[index];
      switch (element) {
        case 'Montag ':
          meals[0] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'Dienstag ':
          meals[1] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'Mittwoch ':
          meals[2] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'Donnerstag ':
          meals[3] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'Freitag ':
          meals[4] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        default:
          break;
      }
    }
    return meals;
  });

  return meals;
}

function addMeals(meals, entries) {
  var currentDay = moment().isoWeekday();
    for (let index = 0; index < (6 - currentDay); index++) {
      const first = entries[index];
      const second = entries[index + 1];

      if(first.start[0] === second.start[0] &&
        first.start[1] === second.start[1] &&
        first.start[2] === second.start[2]) {
          entries[index].description += "\n\nMittagessen:\n" + meals[currentDay + index];
      }
    }
}