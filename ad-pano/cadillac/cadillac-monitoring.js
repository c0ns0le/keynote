/**
 * Cloud Pano (Cadillac) Monitoring
 * HEAD requests on all image and video assets in the 19 cadillac jsons
 **/

Scripter.Logging = 1;

// ====
// Variables
var country = "ca"
var hostWhitelist = ['\.bing\.com', 'video\.msn\.com', 'appexblu\.stb\.s-msn\.com', 'appex-rf\.msn\.com'];
var baseUrl = country == "en" ? "http://en-us.appex-rf.msn.com/cp/v1/en-us/Ad/cadillacATS" : '';
    baseUrl = country == "ca" ? "http://en-ca.appex-rf.msn.com/cp/v1/en-ca/Ad/cadillacATS" : '';
var maxIndex = 20;

var us2005 = ["387f3a16bc03548fb783008a28d44cc8", "dee8285685f7fd66214ee1673a4b76b8", "f12b0cd161c4bc08e2fd38459882a641", "23393009b2891f9b122513735fcfb593", "6ae450b36b1f5a743bc845535158fb1c", "c9f0746d4ca0274981ba85863d6c3650", "ee454cb5aa36d64b58921a1d6713c36c", "39b0c7d3181d0827e01451016b038c87", "5a4d99a935dc15998261379382f17678", "f8988cc8ebc99e806a8a6e9e1b0facbd", "4524e28f0da743eee7e6cdcaa2efbb24", "337a13db6be4e8dc023a9eab7448f274", "055021744ce00395f271d1ae3e2db639", "d376ed1f7be8c7b68b23e10e6fb8d506", "c9044b3d98052543d8b7cacacbf16ac5", "bcf72e9731a3c298bf734a72d99384c2", "00f82ea2ffbfdccdd3e7754eecc0f329", "c50841e73a577bc6731b533758f89e30", "5a7b1aafe0fe9e1f9fa22fd6719795f2", "ce88667ba0ff918def42479331e11529"];
var ca2007 = ["5ac66a36ad9d0191aed33c71779f3ffc", "450cd06884d83d345072d456447eb3be", "bef4b3ab08150343f7e1aebe68674691", "1da0293279d7cb5ba4523688d0f0ec2c", "91b1ffae0bb82cf2df0526226960010a", "b1afab7236d42144d7998aed414bff88", "7636ff42cd3136faeb0bcb51557a46cd", "713ea57f5ae14e7f6e4364ae06468a3f", "ec3d88497d42a03a5893c00e4afb0375", "3e7d5bf8ec3b9b4e2bfc14033ca262ae", "6bd6cc7492749a664e3cd6a5793e5750", "aa15d2c80bfc9d43dcf50746bb5a3827", "9b1b68ccaaa4837e2022e2de6a8f8e83", "f40d4d2a6f82a93cb08ee1dc97df0479", "26d61a90c35fa5ba7fb4a77841be98e9", "db8efcc13189aa2b1551ecb292e4823d", "4dd0c6c8d3b489db8504a7f2ed1a6826", "30b0f764d635d16334217602c90b986a", "ece4706ec5cbad0f0433c53f07c3a827", "5bf53c31fbdd23ff655ef623463765ce"];

var errors = false;
var errorLog = [];
var errorSummary = '';
var response = '';
var links = [];
var contentIds = [];
var whitelistRegex = [];

// ====
// Functions

var md5=function(h){function i(c,d){return((c>>1)+(d>>1)<<1)+(c&1)+(d&1)}for(var m=[],l=0;64>l;)m[l]=0|4294967296*Math.abs(Math.sin(++l));return function(c){for(var d,g,f,a,j=[],c=unescape(encodeURI(c)),b=c.length,k=[d=1732584193,g=-271733879,~d,~g],e=0;e<=b;)j[e>>2]|=(c.charCodeAt(e)||128)<<8*(e++%4);j[c=(b+8>>6)*h+14]=8*b;for(e=0;e<c;e+=h){b=k;for(a=0;64>a;)b=[f=b[3],i(d=b[1],(f=i(i(b[0],[d&(g=b[2])|~d&f,f&d|~f&g,d^g^f,g^(d|~f)][b=a>>4]),i(m[a],j[[a,5*a+1,3*a+5,7*a][b]%h+e])))<<(b=[7,12,17,22,5,9,14,20,4,11,h,23,6,10,15,21][4*b+a++%4])|f>>>32-b),d,g];for(a=4;a;)k[--a]=i(k[a],b[a])}for(c="";32>a;)c+=(k[a>>3]>>4*(1^a++&7)&15).toString(h);return c}}(16);

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


// ====
// Script
for(var i in hostWhitelist) {
  whitelistRegex.push(new RegExp('http:\/\/.*' + hostWhitelist[i], 'i'));
}

for(var j=0;j<maxIndex;j++) {
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
  if((country == 'us' && md5(panoJs) != us2005[j]) ||
     (country == 'ca' && md5(panoJs) != ca2007[j])) {
    Scripter.Log("**ERROR MD5 hash for pano #" + j + " does not match.");
    errorSummary += "MD5 " + j;
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
for(var link in links) {
  if(isEmptyOrNull(fetchContent(link, 'head'))) {
    errorLog.push("Head request for " + link + " failed. Error code " + KNWeb.ErrorNumber);
    errorSummary += KNWeb.ErrorNumber + ' ' + link + ' ';
    error = true;
  }
}
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
  setError(99900, errorSummary);
}

//*/
