const { writeFileSync } = require('fs')
const ics = require('ics')
const moment = require('moment')
const getJson = require('get-json')
const crawler = require('crawler-request')

getJson('https://stuv-mosbach.de/survival/api.php?action=getLectures&course=INF18B')
  .then(async function (response) {

    let events = response.filter(function (event) {
      return event.over === false && event.name !== "Studientag";
    });

    var entries = [];
    let i = 0;
    events.forEach(function (event) {
      var startDate = event.start_date.split('.');
      var startTime = event.start_time.split(':');

      var entry = {
        productId: "Vorlesungsplan",
        uid: i++ + "@DHBWMosbach.de",
        title: event.name,
        start: [Number(startDate[2]), Number(startDate[1]), Number(startDate[0]), Number(startTime[0]) - 1, Number(startTime[1])],
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
      
      //console.log(entries);

      push(value);
    });
  }).catch(function (error) {
    console.log(error);
  });

function push(value) {
  writeFileSync(`${__dirname}/events.ics`, value)

  console.log("Saving...");
  require('simple-git')()
    .add("./events.ics")
    .commit("Update " + moment().format('YYYY-MM-DD:hh:mm:ss'))
    //.push(['-u', 'origin', 'master'], () => console.log("Pushed to Github")); 
}

async function getMeals() {
  var meals = new Array(5);

  meals = await crawler("https://www.studentenwerk.uni-heidelberg.de/sites/default/files/download/pdf/sp-mos-mensa-aktuell.pdf").then(function (response) {

    var chars = response.text.split('\n');

    for (let index = 0; index < chars.length; index++) {
      var element = chars[index];
      
      switch (element.trim().toLowerCase()) {
        case 'montag':
          meals[0] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'dienstag':
          meals[1] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'mittwoch':
          meals[2] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'donnerstag':
          meals[3] = chars[index + 1] + "\n" + chars[index + 2] + "\n" + chars[index + 3] + "\n" + chars[index + 4];
          break;
        case 'freitag':
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
    let index = 0;
    
    if (new Date().getDay() > 5 || new Date().getDay() < 1) {
      return;
    }
    
    while (index < entries.length - 1) {
      const first = entries[index];
      const second = entries[index + 1];
      const dateFirst = new Date(Date.UTC(first.start[0], first.start[1] - 1, first.start[2], first.start[3], first.start[4]));
      const dateSecond = new Date(Date.UTC(second.start[0], second.start[1] - 1, second.start[2], second.start[3], second.start[4]));

      if (dateSecond.getDay() < dateFirst.getDay()) {
        break;
      }

      if (first.start[0] === second.start[0] &&
        first.start[1] === second.start[1] &&
        first.start[2] === second.start[2]) {
          entries[index + 1].description += "\n\nMittagessen:\n" + meals[dateSecond.getDay() - 1];
      }
      index++;
    }
}
