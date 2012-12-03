/*
 * Cadillac template checker
 * Pings the template(js,html,css) files with a blank json
 */

Scripter.Logging = 1;

// ====
// Variables
var entryUrl = KNWeb.GetURL(0);

// ====
// Functions
var setError = function(errorCode, description) { Scripter.Log(description); Scripter.SetError(errorCode, true); KNWeb.SetErrorDetails(errorCode, description); } 
var isNull = function(obj) { return typeof obj == 'undefined'; } 
var checkNull = function(obj, description) { if(isNull(obj)) { setError(-90404, description + " is null"); } } 
var isEmptyOrNull = function(obj) { if(isNull(obj)) { return true; } if(typeof obj == 'string' && obj == '') { return true; } return false; } 

var fetchContent = function(url, request) { var request = typeof request == 'undefined'? 'get' : request; var result; KNWeb.SessionRC = true; if(/head/i.test(request)) { Scripter.Log("Issuing HEAD request for: " + url); result = KNWeb.Head(url); } else { Scripter.Log ("Issuing GET request for: " + url); result = KNWeb.Get(url); } if(!result) { return ''; } var header = KNWeb.GetResponseHeaders(0); if(isEmptyOrNull(header)) { return '' } var resp = header.match(/[^\r\n]*/); if(!isEmptyOrNull(resp)) { Scripter.Log("Received a response of '" + resp + "'."); } else { Scripter.Log("No header response!"); return ''; } if(/get/i.test(request) && /200/.test(header)) { return KNWeb.GetContent(0); } return header; } 

// JSON parser - provided by Alexander Nip
var extractString = function (content, startIndex) { var index = content.indexOf("\"", startIndex); var value = null; if (index === startIndex && index >= 0) { var startStringIndex = index + 1; if (startStringIndex < content.length) { var regularQuoteIndex = content.indexOf("\"", startStringIndex); var escapedQuoteIndex = -1; if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } } while(escapedQuoteIndex >= 0 && regularQuoteIndex >= 0 && escapedQuoteIndex < regularQuoteIndex) { var nextIndex = regularQuoteIndex + 1; if (nextIndex < content.length) { regularQuoteIndex = content.indexOf("\"", nextIndex); if (regularQuoteIndex >= 0) { var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex); if (escapeIndex === regularQuoteIndex - 1) { escapedQuoteIndex = escapeIndex; } else { escapedQuoteIndex = -1; } } } } if (regularQuoteIndex >= 0) { var str = content.substr(startStringIndex, regularQuoteIndex - startStringIndex); str = str.replace(/^\s+|\s+$/g, ""); value = { value: str, startIndex: startStringIndex, endIndex: regularQuoteIndex } } } } return value; } 
var getNextDelimiter = function (content, index) { var closestIndex = content.length + 1; var closestDelimiter = ""; if (index < content.length) { var openCurlyBracketIndex = content.indexOf("{", index); if (openCurlyBracketIndex >= 0) { closestIndex = openCurlyBracketIndex; closestDelimiter = "{"; } var closeCurlyBracketIndex = content.indexOf("}", index); if (closeCurlyBracketIndex >= 0 && closeCurlyBracketIndex < closestIndex) { closestIndex = closeCurlyBracketIndex; closestDelimiter = "}"; } var openSquareBracketIndex = content.indexOf("[", index); if (openSquareBracketIndex >= 0 && openSquareBracketIndex < closestIndex) { closestIndex = openSquareBracketIndex; closestDelimiter = "["; } var closeSquareBracketIndex = content.indexOf("]", index); if (closeSquareBracketIndex >= 0 && closeSquareBracketIndex < closestIndex) { closestIndex = closeSquareBracketIndex; closestDelimiter = "]"; } var doubleQuoteIndex = content.indexOf("\"", index); if (doubleQuoteIndex >= 0 && doubleQuoteIndex < closestIndex) { closestIndex = doubleQuoteIndex; closestDelimiter = "\""; } var colonIndex = content.indexOf(":", index); if (colonIndex >= 0 && colonIndex < closestIndex) { closestIndex = colonIndex; closestDelimiter = ":"; } var commaIndex = content.indexOf(",", index); if (commaIndex >= 0 && commaIndex < closestIndex) { closestIndex = commaIndex; closestDelimiter = ","; } } if (closestIndex === content.length + 1) { closestIndex = -1; } return { delimiter: closestDelimiter, index: closestIndex }; } 
var getSnippet = function (content, index, length) { length = length || 100; var snippet = ""; var half = length / 2; var startIndex = (index - half) >= 0 ? (index - half) : index; var endIndex = (index + half) < content.length ? (index + half) : content.length - 1; if (startIndex < endIndex) { snippet = content.substr(startIndex, endIndex - startIndex ); } return snippet; } 
var parseJSON = function (content, index) { var delimData = getNextDelimiter(content, index); var value = null; var snippet = ""; if (delimData.index >= 0) { if (delimData.delimiter === "\"") { var strValue = extractString(content, delimData.index); if (strValue) { value = { value: strValue.value, endIndex: strValue.endIndex } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{") { var newObject = {}; delimData = getNextDelimiter(content, delimData.index + 1); while (delimData.index >= 0 && delimData.delimiter !== "}") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { delimData = getNextDelimiter(content, strData.endIndex + 1); if (delimData.index >= 0 && delimData.delimiter === ":") { var parsedChildResult = parseJSON(content, delimData.index + 1); if (parsedChildResult) { newObject[strData.value] = parsedChildResult.value; delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to find \":\" in field.", snippet: getSnippet(content, delimData.index) } } } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if(delimData.delimiter === ",") { } delimData = getNextDelimiter(content, delimData.index + 1); } value = { value: newObject, endIndex: delimData.index } } else if (delimData.delimiter === "[") { var newArray = []; var lastWasComma = false; var skipComma = false; var lastIndex = delimData.index + 1; delimData = getNextDelimiter(content, lastIndex); while (delimData.index >= 0 && delimData.delimiter !== "]") { if (delimData.delimiter === "\"") { var strData = extractString(content, delimData.index); if (strData) { newArray.push(strData.value); delimData = getNextDelimiter(content, strData.endIndex + 1); lastIndex = strData.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse string.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === "{" || delimData.delimiter === "[") { var parsedChildResult = parseJSON(content, delimData.index); if (parsedChildResult) { newArray.push(parsedChildResult.value); delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1); lastIndex = parsedChildResult.endIndex + 1; lastWasComma = false; skipComma = true; continue; } else { throw { message: "Failed to parse object.", snippet: getSnippet(content, delimData.index) } } } else if (delimData.delimiter === ",") { if (!skipComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } lastIndex = delimData.index + 1; lastWasComma = true; skipComma = false; } delimData = getNextDelimiter(content, delimData.index + 1); } if (lastWasComma) { var length = delimData.index - lastIndex; if (length > 0) { var strValue = content.substr(lastIndex, length); newArray.push(strValue); } } value = { value: newArray, endIndex: delimData.index } } else if (delimData.delimiter === "," || delimData.delimiter === "}" || delimData.delimiter === "]") { var length = delimData.index - index; if (length > 0) { var strValue = content.substr(index, length); value = { value: strValue, endIndex: (delimData.index - 1) } } else { value = ""; } } } return value; }


var pingTemplates = function(json) {
  checkNull(json['template']);
  checkNull(json['template']['templateFile']);
  checkNull(json['template']['cssFile']);
  checkNull(json['template']['htmlFile']);

  if(! fetchContent(json['template']['templateFile'].replace(/\\\//gm, '/'), 'head') ||
     ! fetchContent(json['template']['cssFile'].replace(/\\\//gm, '/'), 'head') || 
     ! fetchContent(json['template']['htmlFile'].replace(/\\\//gm, '/'), 'head')) {
    setError(KNWeb.ErrorNumber, "One of template (html,css,js) files cannot be pinged!");
  }
}

// ====
// Script

var content = fetchContent(entryUrl);
if(!content) {
  setError(KNWeb.ErrorNumber, url + " failed to download!");
}
Scripter.Log("Response content length: " + content.length);
try {
  var json = parseJSON(content,0).value;
}
catch(err) { Scripter.Log("Error parsing the JSON: " + err.message); }

pingTemplates(json);
