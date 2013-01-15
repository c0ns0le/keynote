/**
 * AppEx Common UX Ad Pano Monitoring
 * Makes HEAD requests on all image and video assets in the jsons
 *
 * Version 0.4
 * Last modified: Dec 14, 2012
 *
 * Changelog:
 * - Adding retry logic, so anything not responded with 200 will retry three times
 * - Streamlining common functions so they all using the most updated copy
 **/

Scripter.Logging = 1;

// ====
// Variables
var country = <CHANGE_THIS|"ca">;
var startIndex = <CHANGE_THIS|0>;
var endIndex = <CHANGE_THIS|10>;
var hostWhitelist = ['\.bing\.com', 'video\.msn\.com', 'appexblu\.stb\.s-msn\.com', 'appex-rf\.msn\.com'];
var baseUrl = country == "us" ? <CHANGE_THIS|"http://en-us.appex-rf.msn.com/cp/v1/en-us/Ad/cadillacATS"> : '';
    baseUrl = country == "ca" ? <CHANGE_THIS|"http://en-ca.appex-rf.msn.com/cp/v1/en-ca/Ad/cadillacATS"> : baseUrl;
//var numPingLinks = 50;
//var numPingVideos = 30;

var errors = false;
var errorLog = [];
var errorSummary = '';
var response = '';
var links = [];
var contentIds = [];
var whitelistRegex = [];

// ====
// Functions

// Generated Thu, Dec 13, 2012  1:26:14 PM
var extractString = function (content, startIndex) { var index = content.indexOf("\"", startIndex); var value = null; if (index === startIndex && index >= 0) { var startStringIndex = index + 1; if (startStringIndex < content.length) { var regularQuoteIndex = content.indexOf("\"", startStringIndex); var escapedQuoteIndex = -1; if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } } while(escapedQuoteIndex >= 0 && regularQuoteIndex >= 0 && escapedQuoteIndex < regularQuoteIndex) { var nextIndex = regularQuoteIndex + 1; if (nextIndex < content.length) { regularQuoteIndex = content.indexOf("\"", nextIndex); if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } else { escapedQuoteIndex = -1; } } } } if (regularQuoteIndex >= 0) { var str = content.substr(startStringIndex, regularQuoteIndex - startStringIndex); str = str.replace(/^\s+|\s+$/g, ""); value = { value: str, startIndex: startStringIndex, endIndex: regularQuoteIndex } } } } return value; } 
var getNextDelimiter = function (content, index) { var closestIndex = content.length + 1; var closestDelimiter = ""; if (index < content.length) { var openCurlyBracketIndex = content.indexOf("{", index); if (openCurlyBracketIndex >= 0) { closestIndex = openCurlyBracketIndex; closestDelimiter = "{"; } var closeCurlyBracketIndex = content.indexOf("}", index); if (closeCurlyBracketIndex >= 0 && closeCurlyBracketIndex < closestIndex) { closestIndex = closeCurlyBracketIndex; closestDelimiter = "}"; } var openSquareBracketIndex = content.indexOf("[", index); if (openSquareBracketIndex >= 0 && openSquareBracketIndex < closestIndex) { closestIndex = openSquareBracketIndex; closestDelimiter = "["; } var closeSquareBracketIndex = content.indexOf("]", index); if (closeSquareBracketIndex >= 0 && closeSquareBracketIndex < closestIndex) { closestIndex = closeSquareBracketIndex; closestDelimiter = "]"; } var doubleQuoteIndex = content.indexOf("\"", index); if (doubleQuoteIndex >= 0 && doubleQuoteIndex < closestIndex) { closestIndex = doubleQuoteIndex; closestDelimiter = "\""; } var colonIndex = content.indexOf(":", index); if (colonIndex >= 0 && colonIndex < closestIndex) { closestIndex = colonIndex; closestDelimiter = ":"; } var commaIndex = content.indexOf(",", index); if (commaIndex >= 0 && commaIndex < closestIndex) { closestIndex = commaIndex; closestDelimiter = ","; } } if (closestIndex === content.length + 1) { closestIndex = -1; } return { delimiter: closestDelimiter, index: closestIndex }; } 
var getSnippet = function (content, index, length) { length = length || 100; var snippet = ""; var half = length / 2; var startIndex = (index - half) >= 0 ? (index - half) : index; var endIndex = (index + half) < content.length ? (index + half) : content.length - 1; if (startIndex < endIndex) { snippet = content.substr(startIndex, endIndex - startIndex ); } return snippet; } 
var parseJSON = function (content, index) { var delimData = getNextDelimiter(content, index); var value = null; var snippet = ""; if (delimData.index >= 0) { if (delimData.delimiter === "\"") { var strValue = extractString(content, delimData.index); if (strValue) { value = { value: strValue.value, endIndex: strValue.endIndex } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{") { var newObject = {}; delimData = getNextDelimiter(content, delimData.index + 1); while (delimData.index >= 0 && delimData.delimiter !== "}") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { delimData = getNextDelimiter(content, strData.endIndex + 1); if (delimData.index >= 0 && delimData.delimiter === ":") { var parsedChildResult = parseJSON(content, delimData.index + 1); if (parsedChildResult) { newObject[strData.value] = parsedChildResult.value; delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to find \":\" in field.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if(delimData.delimiter === ",") { } delimData = getNextDelimiter(content, delimData.index + 1); } value = { value: newObject, endIndex: delimData.index } } else if (delimData.delimiter === "[") { var newArray = []; var lastWasComma = false; var skipComma = false; var lastIndex = delimData.index + 1; delimData = getNextDelimiter(content, lastIndex); while (delimData.index >= 0 && delimData.delimiter !== "]") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { newArray.push(strData.value); delimData = getNextDelimiter(content, strData.endIndex + 1); lastIndex = strData.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{" || delimData.delimiter === "[") { var parsedChildResult = parseJSON(content, delimData.index); if (parsedChildResult) { newArray.push(parsedChildResult.value); delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); lastIndex = parsedChildResult.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === ",") { if (!skipComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } lastIndex = delimData.index + 1; lastWasComma = true; skipComma = false; } delimData = getNextDelimiter(content, delimData.index + 1); } if (lastWasComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } value = { value: newArray, endIndex: delimData.index } } else if (delimData.delimiter === "," || delimData.delimiter === "}" || delimData.delimiter === "]") { var length = delimData.index - index; if (length > 0) { var strValue = content.substr(index, length); value = { value: strValue, endIndex: (delimData.index - 1) } } else { value = ""; } } } return value; }
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)'; var manifestBaseUrl = "http://edge%ENDPOINT%.catalog.video.msn.com/videobyuuid.aspx?uuid="; var numManifestServers = 5; var formatCode = ['1002', '103']; var filetype = '(mp4|wmv)'; 
var setError = function(errorCode, description) { Scripter.Log(description); Scripter.SetError(errorCode, true); KNWeb.SetErrorDetails(errorCode, 'ERROR', description); } 
var isNull = function(obj) { return obj == undefined; } 
var checkNull = function(obj, description) { if(isNull(obj)) { setError(-90404, description + " is null"); } } 
var isEmptyOrNull = function(obj) { if(isNull(obj)) { return true; } if(typeof obj == 'string' && obj == '') { return true; } return false; } 
var fetchContent = function(url, request, retry) { var request = request == undefined? 'get' : request; var retry = retry == undefined? 3 : retry; var result; KNWeb.SessionRC = true; retry--; if(/head/i.test(request)) { Scripter.Log("Issuing HEAD request for: " + url); result = KNWeb.Head(url); } else { Scripter.Log ("Issuing GET request for: " + url); result = KNWeb.Get(url); } if(!result) { if(retry < 0) { return ''; } return fetchContent(url, request, retry-1); } var header = KNWeb.GetResponseHeaders(0); if(isEmptyOrNull(header)) { if(retry < 0) { return 'empty header'; } return fetchContent(url, request, retry-1); } var resp = header.match(/[^\r\n]*/); if(isEmptyOrNull(resp)) { if(retry < 0) { Scripter.Log("No header response!"); return ''; } return fetchContent(url, request, retry-1); } else { Scripter.Log("Received a response of '" + resp + "'."); } if(/get/i.test(request) && /200/.test(header)) { return KNWeb.GetContent(0); } return header; } 
var fetchManifestUrl = function(baseUrl) { serverEndpoint = Math.floor((Math.random()*numManifestServers)+1); return manifestBaseUrl.replace("%ENDPOINT%", serverEndpoint); } 
var getTitle = function(content) { regex = new RegExp('<title>(.*?)<\/title>', 'im'); title = content.match(regex); if(!title || title.length != 2) { return 'NA'; } return title[1].replace(/^\s+|\s+$/g, ''); } 
var getContentId = function(url) { match = url.match(/uuid=([0-9a-zA-Z-]*)/i); if(!match) { return ''; } return match[1]; } 
var verifyVideosInManifest = function(manifestUrl, format) { pingVideoEndpoint = false; failed = true; parsingError = false; format = typeof format === 'undefined'? ['*'] : format; format = typeof format === 'string'? [format] : format; content = fetchContent(manifestUrl); if(isEmptyOrNull(content)) { Scripter.Log("** FAILED on downloading manifest file"); errorLog.push("**ERROR**\tManifest file missing - " + manifestUrl); errorSummary += getContentId(manifestUrl) + '; '; return failed; } Scripter.Log("Processing format(s): " + format); for(var i=0; i<format.length; i++) { regex = new RegExp('<videoFile formatCode="' + format[i] + '".*?<\/videoFile>', 'gim'); videoFiles = content.match(regex); if(!videoFiles) { Scripter.Log("*** FAILED on format " + format[i] + "."); errorLog.push("**WARNING**\tManifest " + manifestUrl + " does not have format code " + format[i]); continue; } if(videoFiles.length != 1 && format[i] != '*' ) { Scripter.Log("** PARSING ERROR on manifest " + manifestUrl); errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl); errorSummary += getContentId(manifestUrl) + '; '; parsingError = true; break; } for(var j=0; j<videoFiles.length; j++) { regex = new RegExp('http[^"]*\.' + filetype, 'gi'); videoUris = videoFiles[j].match(regex); if(!videoUris) { Scripter.Log("*** FAILED on finding a matching video for format " + format[i] + "."); errorLog.push("**WARNING**\tNo " + filetype + " file for format code " + format[i] + " in manifest " + manifestUrl); continue; } if(videoUris.length != 1) { Scripter.Log("** PARSING ERROR on manifest " + manifestUrl); errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl); errorSummary += getContentId(manifestUrl) + '; '; parsingError = true; break; } else { Scripter.Log("Found video url for format " + format[i] + ": " + videoUris[0]); if(pingVideoEndpoint && isEmptyOrNull(fetchContent(videoUris[0], 'head'))) { errorLog.push("Head request for " + videoUris[0] + " failed. Error code " + KNWeb.ErrorNumber); errors = true; } } } failed = false; } if(failed) { for(var i=0; i<format.length; i++) { errorLog.pop(); } errorLog.push("**ERROR**\tManifest " + manifestUrl + " does not have format code(s) " + format); errorSummary += ' No ' + format + ' for ' + getContentId(manifestUrl); } return failed || parsingError; }

var isWhitelisted = function(url) {
  whitelisted = false;
  for(var i in whitelistRegex) {
    whitelisted |= whitelistRegex[i].test(url);
  }
  return whitelisted;
}

/*
var randomDownsize = function(elems, size) {
  if(size <= elems) { return elems; }
  var lottery = [];
  var range = [[0,elems.length-1]];
  while(lottery.length < size) {
    var t_range = [];
    for(var r in range) {
      i = range[r];
      if(i[0] > i[1]) { continue; }
      var ball = i[0] + Math.floor(Math.random()*(i[1]-i[0]+1));
      lottery.push(ball);
      if(lottery.length == size) { break; }
      if(ball != 0)    { t_range.push([i[0], ball-1]); }
      if(ball != size) { t_range.push([ball+1, i[1]]); }
    }
    range = t_range;
  }

  var ret = [];
  for(ball in lottery) {
    ret.push(elems[lottery[ball]]);
  }
  return ret;
}
*/


// ====
// Script
for(var i in hostWhitelist) {
  whitelistRegex.push(new RegExp('http:\/\/.*' + hostWhitelist[i], 'i'));
}

for(var j=startIndex;j<endIndex;j++) {
  num = j==0? '' : j;
  url = baseUrl + num + ".js";

  panoJs = fetchContent(url);
  if(isEmptyOrNull(panoJs)) {
    Scripter.Log("Error " + KNWeb.ErrorNumber + " on fetching pano js: " + url + ". Skipping and logging error");
    errorLog.push("**ERROR**\tFailed on fetching pano js: " + url + ". Error code: " + KNWeb.ErrorNumber);
    errorSummary += KNWeb.ErrorNumber + ' ' + url + ' ';
    errors = true;
    continue;
  }
  panoJs = panoJs.replace(/\\\//gm, '/');
  Scripter.Log("Response content length: " + panoJs.length);

  // Find all videoSource
  videoContentIds = panoJs.match(/"videoSource":"([^"&]*)"/gi);
  if(videoContentIds) {
    for(var i in videoContentIds) {
      if(!/^"videoSource"/.test(videoContentIds[i])) { continue; }
      videoContentId = videoContentIds[i].match(/"videoSource":"([^"&]*)"/i)[1];
      Scripter.Log("Found video content id: " + videoContentId);
      contentIds[videoContentId] = '';
    }
  }


  // Find all http links
  panoLinks = panoJs.match(/http:\/\/[\w\d\.\-\/]*/gi);
  if(!panoLinks) {
    setError(-99501, "No URLs found! Is JSON empty?");
  }
  Scripter.Log("Found " + panoLinks.length + " links.");
  for(var i in panoLinks) {
    //Scripter.Log(+i+1 + ". " + panoLinks[i]);
    if(/^http/.test(panoLinks[i]) && isWhitelisted(panoLinks[i])) {
      links[panoLinks[i]] = '';
    }
  }
}

Scripter.Log("\nProcessing requests.");
//Scripter.Log("Cherry picking " + numPingLinks + " links to ping, " + numPingVideos + " videos to ping.");
//links = randomDownsize(links, numPingLinks);
for(var link in links) {
  if(isEmptyOrNull(fetchContent(link, 'head'))) {
    errorLog.push("Head request for " + link + " failed. Error code " + KNWeb.ErrorNumber);
    errorSummary += KNWeb.ErrorNumber + ' ' + link + ' ';
    error = true;
  }
}
//contentIds = randomDownsize(contentIds, numPingVideos);
for(var contentId in contentIds) {
  manifestUrl = fetchManifestUrl(manifestBaseUrl)+contentId;
  manifestError = verifyVideosInManifest(manifestUrl, formatCode);
  errors |= manifestError;
  if(manifestError) {
    continue;
  }
}

// Display all the errors
/*
Scripter.Log("\n\n========\nError Log - " + errorLog.length + "\n========");
if(errorLog.length < 1) {
  Scripter.Log("None.");
}
else {
  for(var i in errorLog) {
    Scripter.Log(errorLog[i]);
  }
}
//*/

if(errors) {
  Scripter.Log("Summary: " + errorSummary);
  setError(-99900, errorSummary);
}

//*/
