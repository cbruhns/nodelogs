require('dotenv').config();
// import Google api library
const { google } = require("googleapis");
// import the Google drive module in google library
var drive = google.drive("v3");
// import fs handle data in the file system
var fs = require("fs");
var moment = require("moment");
var momentTimezone = require("moment-timezone");
var key = require("./key.json");

var winston = require("winston");
const { format } = require('logform');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
  return  `${moment().tz('America/New_York').format("x dddd, MMMM Do YYYY, h:mm:ss a zz")} :: ${info.level}: ${info.message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});


var CronJob = require('cron').CronJob;
new CronJob('0-59/10 * * * * *', function() {
    var date = new Date().toISOString();
    logger.log({
      level: 'info',
      message: 'Server status good.'
    });
}, null, true, 'America/New_York');



// console.log(process.env);

// retrieve a JWT
var jwToken = new google.auth.JWT(
    process.env.DRIVE_USER,
    null,
    key.private_key, ["https://www.googleapis.com/auth/drive"],
    null
);
jwToken.authorize((authErr) => {
    if (authErr) {
        console.log("error : " + authErr);
        return;
    } else {
        console.log("Authorization accorded");
    }
});


// list file in speciifcs folder
// var parents = process.env.DRIVE_FOLDER;
// drive.files.list({
//     auth: jwToken,
//     pageSize: 10,
//     q: "'" + parents + "' in parents and trashed=false",
//     fields: 'files(id, name)',
// }, (err, {
//     data
// }) => {
//     if (err) return console.log('The API returned an error: ' + err);
//     const files = data.files;
//     if (files.length) {
//         console.log('Files:');
//         files.map((file) => {
//             console.log(`${file.name} (${file.id})`);
//         });
//     } else {
//         console.log('No files found.');
//     }
// });

new CronJob('* * 1-23/2 * * *', function() {

    var fileMetadata = {
        'name': 'LOG-'+new Date().toISOString(),
        parents: [process.env.DRIVE_FOLDER]
    };
    var media = {
        mimeType: 'text/plain',
        body: fs.createReadStream('logs/combined.log')
    };
    logger.log({
        level: 'info',
        message: 'END LOG FILE'
    });
    drive.files.create({
        auth: jwToken,
        resource: fileMetadata,
        media: media,
        fields: 'id'
    }, function (err, file) {
        if (err) {
            // Handle error
            // console.error(err);
            // console.log('error uploading file');
            logger.log({
                level: 'error',
                message: 'Log files failed to upload to google drive'
            });
        } else {
            fs.truncate('logs/combined.log', 0, function(){
                logger.log({
                    level: 'info',
                    message: 'LOG UPLOAD SUCCESSFUL :: PRECEEDING-FILE-ID:'file.data.id
                });
                logger.log({
                    level: 'info',
                    message: 'BEGIN LOG FILE'
                });
            });
            // console.log('File Id: ', file.data.id);
        }
    });

}, null, true, 'America/New_York');
