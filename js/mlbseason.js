// #region VARIABLES
// arrays
var fullSeason;
var fullBets;

// dates
var dateObj;
var dateStr;
var seasonStartDate;
var seasonEndDate;

// bad keys - try again 5/1
// bk87n7t2wdmzh89v64rnwq2t
// zmvzszfujyeka8645vb6n9cf
// ffs9ynfsqewqhzc99rsgdtqn

// api
var current_API_Key;
var current_API_Index = 0;
var MLB_API_KEYS = ["3h98e9z4ruk9hhq8ptkp3u6b", "3h4d4ykvhh8v4q534yyddyd8", "wh3vb2y3hd2f5w3hc55m29e5", "c2xkcp8ppxxshn884c7s7u8c", "53gwzh7xzcncfywrb7nrfejr"];
var apiCallFreq = 1000/(MLB_API_KEYS.length - 1);
var apiContinue = false;
// #endregion

// #region INIT
$(function()
{
    // get data from AWS - testing
    //callJSON();

    dateStr = "2021/10/03";
    current_API_Key = "3h98e9z4ruk9hhq8ptkp3u6b";
    call_SR_API_DATE

    // call sports radar api
    SR_API_CALL_ROTATOR();
    call_SR_API_DATE();
});
// #endregion

// #region DATA FUNCTIONS


function getSeasonDate(response)
{
    // get games
    var games = response.games;

    // if season has games
    if(games)
    {
        // sort full season
        games.sort(function(a, b) 
        {
            var keyA = new Date(a.scheduled), keyB = new Date(b.scheduled);
    
            // compare the 2 dates
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });

        // get start & end date
        //var startDate = new Date(games[0].scheduled)
        seasonStartDate = new Date(new Date(games[0].scheduled).setHours(0, 0, 0));
        seasonStartDate = new Date(seasonStartDate.setDate(seasonStartDate.getDate() - 1));
        seasonEndDate = new Date(games[games.length - 1].scheduled);

        // create season array
        createSeasonArray();
    }
    else
    {
        // throw alert
        alert("Error: No Games Found, Cannot Set Start Date")
    }
}

async function createSeasonArray()
{
    // get selected date from dropdown & current year
    var selectedYear = $("#years").val();
    var currentYear = new Date().getFullYear().toString();

    // if not current year, get end date else current date
    dateObj = selectedYear === currentYear ? new Date() : seasonEndDate;

    // loop until date is before the season start date
    do
    {
        // format date for api call
        dateStr = formatDateToString(dateObj);

        // set api flag to false
        apiContinue = false;

        // continously call api until data is found
        do
        {
            // call api function - wait specific amount of time based on # of api keys to avoid 403 error
            await new Promise(resolve => setTimeout(resolve, apiCallFreq));
            SR_API_CALL_ROTATOR();
            call_SR_API_GAMES();
        }
        while(apiContinue === false)

        // finally, decrease date by one day
        dateObj.setDate(dateObj.getDate() - 1);
    }
    while(dateObj >= seasonStartDate);

    // filter by id to remove duplicate values
    fullSeason = fullSeason.filter((value, index, self) => 
    {
        return self.findIndex(v => v.id === value.id) === index;
    });

    // sort by date
    fullSeason = fullSeason.sort((a, b) => new Date(b.scheduled) - new Date(a.scheduled));
}

function getPlayerData(response)
{
    // loop over each game, add to full season array
    response.league.games.forEach(function(game)
    {
        if(!(game.game.home.abbr === "NL" || game.game.away.abbr === "NL"))
        {
            fullSeason.push(game.game);
        }
    });

    apiContinue = true;
}
// #endregion

// #region SEASON & BET JSON FUNCTIONS
async function callJSON()
{
    await MLB_JSON_BET_CALL()
    .then((response) => MLB_JSON_BET_RESP(response))
    .catch((error) => MLB_JSON_ERROR(error));

    await MLB_JSON_SEASON_CALL()
    .then((response) => MLB_JSON_SEASON_RESP(response))
    .catch((error) => MLB_JSON_ERROR(error));
}

function MLB_JSON_BET_RESP(response)
{
    fullBets = response;
}

function MLB_JSON_SEASON_RESP(response)
{
    fullSeason = response;
}

function MLB_JSON_ERROR(error)
{
    alert("Error " + error.status + ": " + error.statusText);
}

function MLB_JSON_BET_CALL()
{
    return new Promise(function(resolve, reject)
    {
        $.getJSON("https://oddsflip.s3.us-west-2.amazonaws.com/mlb_bets_2021.json")
        .done(resolve)
        .fail(reject);
    });
}

function MLB_JSON_SEASON_CALL()
{
    return new Promise(function(resolve, reject)
    {
        $.getJSON("https://oddsflip.s3.us-west-2.amazonaws.com/mlb_season_2021.json")
        .done(resolve)
        .fail(reject);
    });
}

// #endregion

// #region MLB API FUNCTIONS
async function callMLBAPI()
{   
    if(typeof config !== "undefined")
    {
        await MLB_API_CALL()
        .then((response) => mlbAPIResponse(response))
        .catch((error) => mlbAPIError(error));
    }
    else
    {
        alert("Error: config.js file is missing.")
    }
}

async function call_SR_API_DATE()
{   
    if(typeof config !== "undefined")
    {
        await SR_API_CALL_DATE()
        .then((response) => getSeasonDate(response))
        .catch((error) => mlbAPIError(error));
    }
    else
    {
        alert("Error: config.js file is missing.")
    }
}

async function call_SR_API_GAMES()
{   
    if(typeof config !== "undefined")
    {
        await SR_API_CALL_GAMES()
        .then((response) => getPlayerData(response))
        .catch((error) => mlbAPIError(error));
    }
    else
    {
        alert("Error: config.js file is missing.");
    }
}

async function mlbAPIError(error)
{
    if(error.status === 403)
    {
        console.log("Error 403 on Date " + dateStr);
    }
    else
    {
        console.log("Error " + error.status + ": " + error.statusText + " on date " + dateStr);
        //alert("Error " + error.status + ": " + error.statusText);
    }
}

function mlbAPIResponse(response)
{
    // Put the object into storage
    localStorage.setItem('NBA_API_OBJ', JSON.stringify(response));

    // check to make sure storage object exists
    if(localStorage.getItem('NBA_API_OBJ') !== null)
    {
        getNBAGameData();
    }
    else
    {
        alert("Error: No NBA Game Object found.")
    }
}

function MLB_API_CALL()
{
    const settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://api-nba-v1.p.rapidapi.com/games?season=2019",
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "api-nba-v1.p.rapidapi.com",
            "x-rapidapi-key": config.NBA_API_KEY
        }
    };

    return new Promise(function(resolve, reject)
    {
        $.ajax(settings).done(resolve).fail(reject);
    });
}

function SR_API_CALL_DATE()
{
    const settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://elitefeats-cors-anywhere.herokuapp.com/https://api.sportradar.us/mlb/trial/v7/en/games/" + $("#years").val() + "/REG/schedule.json?api_key=" + current_API_Key,
        "method": "GET"
    };

    return new Promise(function(resolve, reject)
    {
        $.ajax(settings).done(resolve).fail(reject);
    });
}

function SR_API_CALL_GAMES()
{
    const settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://elitefeats-cors-anywhere.herokuapp.com/https://api.sportradar.us/mlb/trial/v7/en/games/" + dateStr + "/summary.json?api_key=" + current_API_Key,
        "method": "GET"
    };

    return new Promise(function(resolve, reject)
    {
        $.ajax(settings).done(resolve).fail(reject);
    });
}

function SR_API_CALL_ROTATOR()
{
    // increment api key index, or set to zero if reached end of array
    var index = current_API_Index + 1;
    current_API_Index = index === MLB_API_KEYS.length ? 0 : index;
    
    // set current api key
    current_API_Key = MLB_API_KEYS[current_API_Index];
}
// #endregion

// #region OTHER FUNCTIONS
function formatDateToString(date)
{
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    let year = date.getFullYear();

    return [year, month, day].join('/');
}
// #endregion