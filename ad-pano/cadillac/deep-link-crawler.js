/*
 * Cadillac deep link crawler
 * Finds deep links within the entrypoint json and traverse through to:
 *  1) make sure there's no invalid deeplinks
 *  2) check version number
 */

Scripter.Logging = 1;

// ====
// Variables
var version = 2.005;    // smallest version number to require
var country = "ca";     // us or ca
var deepLinks = [];
var jsonUrls = [];
var entryUrl = KNWeb.GetURL(0);

var us = ["CadillacATS_EN-US_Home", "CadillacATS_EN-US_Patagonia", "CadillacATS_EN-US_Morocco", "CadillacATS_EN-US_Monaco", "CadillacATS_EN-US_China", "CadillacATS_EN-US_Patagonia_SS0", "CadillacATS_EN-US_Patagonia_SS1", "CadillacATS_EN-US_Patagonia_SS2", "CadillacATS_EN-US_Morocco_SS0", "CadillacATS_EN-US_Morocco_SS1", "CadillacATS_EN-US_Morocco_SS2", "CadillacATS_EN-US_Morocco_SS3", "CadillacATS_EN-US_Monaco_SS0", "CadillacATS_EN-US_Monaco_SS1", "CadillacATS_EN-US_Monaco_SS2", "CadillacATS_EN-US_Monaco_SS3", "CadillacATS_EN-US_China_SS0", "CadillacATS_EN-US_China_SS1", "CadillacATS_EN-US_China_SS2", "CadillacATS_EN-US_China_SS3"];
var ca = ["CadillacATS_en-ca_Home", "CadillacATS_en-ca_Patagonia", "CadillacATS_en-ca_Morocco", "CadillacATS_en-ca_Monaco", "CadillacATS_en-ca_China", "CadillacATS_en-ca_Patagonia_SS0", "CadillacATS_en-ca_Patagonia_SS1", "CadillacATS_en-ca_Patagonia_SS2", "CadillacATS_en-ca_Morocco_SS0", "CadillacATS_en-ca_Morocco_SS1", "CadillacATS_en-ca_Morocco_SS2", "CadillacATS_en-ca_Morocco_SS3", "CadillacATS_en-ca_Monaco_SS0", "CadillacATS_en-ca_Monaco_SS1", "CadillacATS_en-ca_Monaco_SS2", "CadillacATS_en-ca_Monaco_SS3", "CadillacATS_en-ca_China_SS0", "CadillacATS_en-ca_China_SS1", "CadillacATS_en-ca_China_SS2", "CadillacATS_en-ca_China_SS3"];

// ====
// Functions
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)'; var manifestBaseUrl = "http://edge%ENDPOINT%.catalog.video.msn.com/videobyuuid.aspx?uuid="; var numManifestServers = 5; var formatCode = ['1002', '103']; var filetype = '(mp4|wmv)'; 
var setError = function(errorCode, description) { Scripter.Log(description); Scripter.SetError(errorCode, true); KNWeb.SetErrorDetails(errorCode, description); } 
var isNull = function(obj) { return obj == undefined } 
var checkNull = function(obj, description) { if(isNull(obj)) { setError(-90404, description + " is null"); } } 
var isEmptyOrNull = function(obj) { if(isNull(obj)) { return true; } if(typeof obj == 'string' && obj == '') { return true; } return false; } 
var fetchContent = function(url, request) { var request = typeof request == 'undefined'? 'get' : request; var result; KNWeb.SessionRC = true; if(/head/i.test(request)) { Scripter.Log("Issuing HEAD request for: " + url); result = KNWeb.Head(url); } else { Scripter.Log ("Issuing GET request for: " + url); result = KNWeb.Get(url); } if(!result) { return ''; } var header = KNWeb.GetResponseHeaders(0); if(isEmptyOrNull(header)) { return '' } var resp = header.match(/[^\r\n]*/); if(!isEmptyOrNull(resp)) { Scripter.Log("Received a response of '" + resp + "'."); } else { Scripter.Log("No header response!"); return ''; } if(/get/i.test(request) && /200/.test(header)) { return KNWeb.GetContent(0); } return header; } 
var fetchManifestUrl = function(baseUrl) { serverEndpoint = Math.floor((Math.random()*numManifestServers)+1); return manifestBaseUrl.replace("%ENDPOINT%", serverEndpoint); } 
var getTitle = function(content) { regex = new RegExp('<title>(.*?)<\/title>', 'im'); title = content.match(regex); if(!title || title.length != 2) { return 'NA'; } return title[1].replace(/^\s+|\s+$/g, ''); } 
var getContentId = function(url) { match = url.match(/uuid=([0-9a-zA-Z-]*)/i); if(!match) { return ''; } return match[1]; } 
var verifyVideosInManifest = function(manifestUrl, format) { failed = true; parsingError = false; format = typeof format === 'undefined'? ['*'] : format; format = typeof format === 'string'? [format] : format; content = fetchContent(manifestUrl); if(isEmptyOrNull(content)) { Scripter.Log("** FAILED on downloading manifest file"); errorLog.push("**ERROR**\tManifest file missing - " + manifestUrl); errorSummary += ' Manifest ' + getContentId(manifestUrl) + ' missing!'; return failed; } Scripter.Log("Processing format(s): " + format); for(i=0; i<format.length; i++) { regex = new RegExp('<videoFile formatCode="' + format[i] + '".*?<\/videoFile>', 'gim'); videoFiles = content.match(regex); if(!videoFiles) { Scripter.Log("*** FAILED on format " + format[i] + "."); errorLog.push("**WARNING**\tManifest " + manifestUrl + " does not have format code " + format[i]); continue; } if(videoFiles.length != 1 && format[i] != '*' ) { Scripter.Log("** PARSING ERROR on manifest " + manifestUrl); errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl); errorSummary += ' Error parsing manifest ' + getContentId(manifestUrl); parsingError = true; break; } for(j=0; j<videoFiles.length; j++) { regex = new RegExp('http[^"]*\.' + filetype, 'gi'); videoUris = videoFiles[j].match(regex); if(!videoUris) { Scripter.Log("*** FAILED on finding a matching video for format " + format[i] + "."); errorLog.push("**WARNING**\tNo " + filetype + " file for format code " + format[i] + " in manifest " + manifestUrl); continue; } if(videoUris.length != 1) { Scripter.Log("** PARSING ERROR on manifest " + manifestUrl); errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl); errorSummary += ' Error parsing manifest ' + getContentId(manifestUrl); parsingError = true; break; } else { Scripter.Log("Found video url for format " + format[i] + ": " + videoUris[0]); if(isEmptyOrNull(fetchContent(videoUris[0], 'head'))) { errorLog.push("Head request for " + videoUris[0] + " failed. Error code " + KNWeb.ErrorNumber); errorSummary += KNWeb.ErrorNumber + ' ' + videoUris[0] + ' '; errors = true; } } } failed = false; } if(failed) { for(i=0; i<format.length; i++) { errorLog.pop(); } errorLog.push("**ERROR**\tManifest " + manifestUrl + " does not have format code(s) " + format); errorSummary += ' Format ' + format + ' for ' + getContentId(manifestUrl); } return failed || parsingError; } 
var extractString = function (content, startIndex) { var index = content.indexOf("\"", startIndex); var value = null; if (index === startIndex && index >= 0) { var startStringIndex = index + 1; if (startStringIndex < content.length) { var regularQuoteIndex = content.indexOf("\"", startStringIndex); var escapedQuoteIndex = -1; if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } } while(escapedQuoteIndex >= 0 && regularQuoteIndex >= 0 && escapedQuoteIndex < regularQuoteIndex) { var nextIndex = regularQuoteIndex + 1; if (nextIndex < content.length) { regularQuoteIndex = content.indexOf("\"", nextIndex); if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } else { escapedQuoteIndex = -1; } } } } if (regularQuoteIndex >= 0) { var str = content.substr(startStringIndex, regularQuoteIndex - startStringIndex); str = str.replace(/^\s+|\s+$/g, ""); value = { value: str, startIndex: startStringIndex, endIndex: regularQuoteIndex } } } } return value; } 
var getNextDelimiter = function (content, index) { var closestIndex = content.length + 1; var closestDelimiter = ""; if (index < content.length) { var openCurlyBracketIndex = content.indexOf("{", index); if (openCurlyBracketIndex >= 0) { closestIndex = openCurlyBracketIndex; closestDelimiter = "{"; } var closeCurlyBracketIndex = content.indexOf("}", index); if (closeCurlyBracketIndex >= 0 && closeCurlyBracketIndex < closestIndex) { closestIndex = closeCurlyBracketIndex; closestDelimiter = "}"; } var openSquareBracketIndex = content.indexOf("[", index); if (openSquareBracketIndex >= 0 && openSquareBracketIndex < closestIndex) { closestIndex = openSquareBracketIndex; closestDelimiter = "["; } var closeSquareBracketIndex = content.indexOf("]", index); if (closeSquareBracketIndex >= 0 && closeSquareBracketIndex < closestIndex) { closestIndex = closeSquareBracketIndex; closestDelimiter = "]"; } var doubleQuoteIndex = content.indexOf("\"", index); if (doubleQuoteIndex >= 0 && doubleQuoteIndex < closestIndex) { closestIndex = doubleQuoteIndex; closestDelimiter = "\""; } var colonIndex = content.indexOf(":", index); if (colonIndex >= 0 && colonIndex < closestIndex) { closestIndex = colonIndex; closestDelimiter = ":"; } var commaIndex = content.indexOf(",", index); if (commaIndex >= 0 && commaIndex < closestIndex) { closestIndex = commaIndex; closestDelimiter = ","; } } if (closestIndex === content.length + 1) { closestIndex = -1; } return { delimiter: closestDelimiter, index: closestIndex }; } 
var getSnippet = function (content, index, length) { length = length || 100; var snippet = ""; var half = length / 2; var startIndex = (index - half) >= 0 ? (index - half) : index; var endIndex = (index + half) < content.length ? (index + half) : content.length - 1; if (startIndex < endIndex) { snippet = content.substr(startIndex, endIndex - startIndex ); } return snippet; } 
var parseJSON = function (content, index) { var delimData = getNextDelimiter(content, index); var value = null; var snippet = ""; if (delimData.index >= 0) { if (delimData.delimiter === "\"") { var strValue = extractString(content, delimData.index); if (strValue) { value = { value: strValue.value, endIndex: strValue.endIndex } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{") { var newObject = {}; delimData = getNextDelimiter(content, delimData.index + 1); while (delimData.index >= 0 && delimData.delimiter !== "}") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { delimData = getNextDelimiter(content, strData.endIndex + 1); if (delimData.index >= 0 && delimData.delimiter === ":") { var parsedChildResult = parseJSON(content, delimData.index + 1); if (parsedChildResult) { newObject[strData.value] = parsedChildResult.value; delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to find \":\" in field.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if(delimData.delimiter === ",") { } delimData = getNextDelimiter(content, delimData.index + 1); } value = { value: newObject, endIndex: delimData.index } } else if (delimData.delimiter === "[") { var newArray = []; var lastWasComma = false; var skipComma = false; var lastIndex = delimData.index + 1; delimData = getNextDelimiter(content, lastIndex); while (delimData.index >= 0 && delimData.delimiter !== "]") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { newArray.push(strData.value); delimData = getNextDelimiter(content, strData.endIndex + 1); lastIndex = strData.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{" || delimData.delimiter === "[") { var parsedChildResult = parseJSON(content, delimData.index); if (parsedChildResult) { newArray.push(parsedChildResult.value); delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); lastIndex = parsedChildResult.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === ",") { if (!skipComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } lastIndex = delimData.index + 1; lastWasComma = true; skipComma = false; } delimData = getNextDelimiter(content, delimData.index + 1); } if (lastWasComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } value = { value: newArray, endIndex: delimData.index } } else if (delimData.delimiter === "," || delimData.delimiter === "}" || delimData.delimiter === "]") { var length = delimData.index - index; if (length > 0) { var strValue = content.substr(index, length); value = { value: strValue, endIndex: (delimData.index - 1) } } else { value = ""; } } } return value; }


var deconstructDeepLink = function(deeplink, url) {
  // Make sure it is a cloud pano deep link
  if(!(/^\/\/application/.test(deeplink) && /entitytype=cloudPano/.test(deeplink))) {
    return ''
  }
  var campaign = deeplink.match(/campaign=([\w\n_-]*)/);
  checkNull(campaign, "campaign ID for " + deeplink);
  checkNull(campaign[1], "campaign ID for " + deeplink);

  var index = deeplink.match(/index=([\w\n_-]*)/);
  checkNull(index, "index for " + deeplink);
  checkNull(index[1], "index for " + deeplink);

  return url.replace(/\/[^\/]*\.js/, '/' + campaign[1] + index[1] + '.js');
}

var extractDeepLink = function(json) {
  // json['pages'][0]['modules'][0]['data']['destinationUri']
  checkNull(json, "JSON definition");
  checkNull(json['pages'], "Pages");

  for(i in json['pages']) {
    checkNull(json['pages'][i], "Page definition");
    checkNull(json['pages'][i]['modules'], "Modules");

    for(j in json['pages'][i]['modules']) {
      checkNull(json['pages'][i]['modules'][j], "Module definition");
      checkNull(json['pages'][i]['modules'][j]['data'], "Module data");

      if(isNull(json['pages'][i]['modules'][j]['data']['destinationUri'])) {
        continue;
      }
      destinationUri = json['pages'][i]['modules'][j]['data']['destinationUri'].replace(/\\\//gm, '/');
      if(/^\/\/application/.test(destinationUri)) {
        var jsonUrl = deconstructDeepLink(destinationUri, entryUrl);
        //Scripter.Log("- Found deep link: " + destinationUri);
        if(isNull(jsonUrls[jsonUrl])) {
          //Scripter.Log("--> Translated deep link to url: " + jsonUrl);
          Scripter.Log("Translated deep link " + destinationUri + " to url: " + jsonUrl);
          jsonUrls[jsonUrl] = '';
        }
        else {
          //Scripter.Log("--> Duplicate!");
        }
      }
    }
  }
}

var checkVersion = function(json) {
  checkNull(json['pano']);
  checkNull(json['pano']['id']);
  checkNull(json['version']);

  var id = json['pano']['id'];
  Scripter.Log("Checking version for " + id + " to be at least " + version.toFixed(4));
  try {
    var current = parseFloat(json['version']);
  }
  catch(err) { Scripter.Log("Version " + json['version'] + " is not number: ") + err.message; }
  if(current < version) {
    setError(-90505, "Expected: at least version " + version + ". Actual: " + current);
  }
}

var checkPanoId = function(json, url) {
  checkNull(json['pano']);
  checkNull(json['pano']['id']);
  var index = url.match(/cadillacATS([0-9]+)\.js/);
  index = isNull(index)? 0 : index[1];
  checkNull(index);
  var panoId = json['pano']['id'];
  var panoIdCheck = country == 'us' ? us[index] : '';
      panoIdCheck = country == 'ca' ? ca[index] : panoIdCheck;
  Scripter.Log("Checking pano ID for " + index + " is " + panoId);
  if (panoId != panoIdCheck) {
    setError(-90505, "Pano ID does not match for " + index + ". Should be " + panoIdCheck + ". Got " + panoId);
  }
}

var crawl = function(url) {
  var content = fetchContent(url);
  if(!content) {
    setError(KNWeb.ErrorNumber, url + " failed to download!");
  }
  Scripter.Log("Response content length: " + content.length);
  try {
    var json = parseJSON(content,0).value;
  }
  catch(err) { Scripter.Log("Error parsing the JSON: " + err.message); }
  // here is the entrypoint to do whatever validations and checks we want with the jsons
  extractDeepLink(json);
  checkVersion(json);
  checkPanoId(json, url);

  for(jsonUrl in jsonUrls) {
    if(jsonUrls[jsonUrl] == 'checked') {
      continue;
    }
    Scripter.Log("Fetching json from " + jsonUrl);
    jsonUrls[jsonUrl] = 'checked';
    crawl(jsonUrl);
  }
}


// ====
// Script
jsonUrls[entryUrl] = 'checked';
crawl(entryUrl)
