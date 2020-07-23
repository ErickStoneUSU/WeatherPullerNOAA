'use strict';

const d = require('download');

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
const execSync = require("child_process").execSync;
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const lineReader = require('line-reader');

const app = express();
const port = 8080;
const path = 'data/';

let db = new sqlite3.Database(path + 'NOAA_DATA.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
        throw err
    }
});


function run_now(sql, params = []){
    db.run(sql, params, function (err) {
        if (err) {
            console.log('Error running sql ' + sql);
            console.log(err);
        }
    });
}

function collect(res, sql, params = []){

    db.all(sql, params, function (err, rows) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
}

function move_to_sql_db() {
    console.log('Populating DB');
    let row_num = 0;
    run_now('CREATE TABLE IF NOT EXISTS fileData (station_id text, year_month text, element text, value1 text, mflag1 text, qflag1 text, sflag1 text, value2 text, MFLAG2 text, QFLAG2 text, SFLAG2 text)');
    lineReader.open(path + '2017.csv', function(err, reader) {
        while (reader.hasNextLine()) {
            reader.nextLine(function(err, line) {
                run_now('INSERT INTO fileData (station_id , year_month , element , value1 , mflag1 , qflag1 , sflag1 , value2 , MFLAG2 , QFLAG2 , SFLAG2) VALUES(?,?,?,?,?,?,?,?,?,?,?)', line.split(','));
            });
            row_num += 1;
            // artificial limit for fast testing and dev
            if (row_num > 100){
                break;
            }
        }
    });
}

function download_file() {
    if (!fs.existsSync( path + '2017.csv.gz')) {
        console.log('Downloading file');
        execSync("curl -O ftp://ftp.ncdc.noaa.gov/pub/data/ghcn/daily/by_year/2017.csv.gz", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
        console.log('COMPLETED DOWNLOAD');
    }
}

function unzip_file() {
    if (!fs.existsSync(path + '2017.csv')) {
        console.log('Unzipping file');
        const fileContents = fs.createReadStream(path + '2017.csv.gz');
        const writeStream = fs.createWriteStream(path + '2017.csv');
        const unzip = zlib.createGunzip();

        fileContents.pipe(unzip).pipe(writeStream);
    }
}


// API Things
function pull_data(res, station_id) {
    let que = 'select * from fileData where station_id = IFNULL(?,station_id)';
    let params = [station_id];
    collect(res, que, params);
}

function setup_api() {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

function setup_routes() {
    // just one route needed per the spec
    app.get('/', (req, res, next) => {
        res.redirect('/docs');
    });
    app.get('/search', (req, res, next) =>
        pull_data(res, req.query.station_id)
    );
    app.get('/search/:station_id', (req, res, next) =>
        pull_data(res, req.params.station_id)
    );
}

function start() {
    // start up the api
    app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
}

download_file();
unzip_file();
move_to_sql_db();
setup_api();
setup_routes();
start();


