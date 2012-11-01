var extractString = function (content, startIndex) {
  var index = content.indexOf("\"", startIndex);
  var value = null;

  if (index === startIndex && index >= 0) {
    var startStringIndex = index + 1;
    if (startStringIndex < content.length) {
      var regularQuoteIndex = content.indexOf("\"", startStringIndex);
      var escapedQuoteIndex = -1;

      if (regularQuoteIndex >= 0) {
        var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex);
        if (escapeIndex === regularQuoteIndex - 1) {
          escapedQuoteIndex = escapeIndex;
        }
      }

      while(escapedQuoteIndex >= 0 && regularQuoteIndex >= 0 &&  escapedQuoteIndex < regularQuoteIndex) {
        var nextIndex = regularQuoteIndex + 1;
        if (nextIndex < content.length) {
          regularQuoteIndex = content.indexOf("\"", nextIndex);

          if (regularQuoteIndex >= 0) {
            var escapeIndex = content.lastIndexOf("\\", regularQuoteIndex);
            if (escapeIndex === regularQuoteIndex - 1) {
              escapedQuoteIndex = escapeIndex;
            } else {
              escapedQuoteIndex = -1;
            }
          }
        }
      }

      if (regularQuoteIndex >= 0) {
        var str = content.substr(startStringIndex, regularQuoteIndex - startStringIndex);
        str = str.replace(/^\s+|\s+$/g, "");

        value = {
          value: str,
          startIndex: startStringIndex,
          endIndex: regularQuoteIndex
        }
      }
    }
  }

  return value;
}

var getNextDelimiter = function (content, index) {
  var closestIndex = content.length + 1;
  var closestDelimiter = "";

  if (index < content.length) {
    var openCurlyBracketIndex = content.indexOf("{", index);
    if (openCurlyBracketIndex >= 0) {
      closestIndex = openCurlyBracketIndex;
      closestDelimiter = "{";
    }

    var closeCurlyBracketIndex = content.indexOf("}", index);
    if (closeCurlyBracketIndex >= 0 && closeCurlyBracketIndex < closestIndex) {
      closestIndex = closeCurlyBracketIndex;
      closestDelimiter = "}";
    }

    var openSquareBracketIndex = content.indexOf("[", index);
    if (openSquareBracketIndex >= 0 && openSquareBracketIndex < closestIndex) {
      closestIndex = openSquareBracketIndex;
      closestDelimiter = "[";
    }

    var closeSquareBracketIndex = content.indexOf("]", index);
    if (closeSquareBracketIndex >= 0 && closeSquareBracketIndex < closestIndex) {
      closestIndex = closeSquareBracketIndex;
      closestDelimiter = "]";
    }

    var doubleQuoteIndex = content.indexOf("\"", index);
    if (doubleQuoteIndex >= 0 && doubleQuoteIndex < closestIndex) {
      closestIndex = doubleQuoteIndex;
      closestDelimiter = "\"";
    }

    var colonIndex = content.indexOf(":", index);
    if (colonIndex >= 0 && colonIndex < closestIndex) {
      closestIndex = colonIndex;
      closestDelimiter = ":";
    }
    var commaIndex = content.indexOf(",", index);
    if (commaIndex >= 0 && commaIndex < closestIndex) {
      closestIndex = commaIndex;
      closestDelimiter = ",";
    }
  }

  if (closestIndex === content.length + 1) {
    closestIndex = -1;
  }

  return {
    delimiter: closestDelimiter,
    index: closestIndex
  };
}

var getSnippet = function (content, index, length) {
  length = length || 100;
  var snippet = "";
  var half = length / 2;
  var startIndex = (index - half) >= 0 ? (index - half) : index;
  var endIndex = (index + half) < content.length ? (index + half) : content.length - 1;

  if (startIndex < endIndex) {
    snippet = content.substr(startIndex, endIndex - startIndex );
  }

  return snippet;
}

var parseJSON = function (content, index) {
  // Keynote does not support looking individual characters in a string.
  var delimData = getNextDelimiter(content, index);
  var value = null;
  var snippet = "";

  if (delimData.index >= 0) {
    if (delimData.delimiter === "\"") {
      // Return a string.
      var strValue = extractString(content, delimData.index);
      if (strValue) {
        //Scripter.Log("JSON extracted string: " + strValue.value);
        value = {
          value: strValue.value,
          endIndex: strValue.endIndex
        }
      } else {
        throw {
          message: "Failed to parse string.",
          snippet: getSnippet(content, delimData.index)
        }
      }
    } else if (delimData.delimiter === "{") {
      // Return an object.
      var newObject = {};

      delimData = getNextDelimiter(content, delimData.index + 1);
      while (delimData.index >= 0 && delimData.delimiter !== "}") {
        // Parse field-value.
        if (delimData.delimiter === "\"") {
          var strData = extractString(content, delimData.index);
          if (strData) {
            //Scripter.Log("JSON extracted string in object: " + strData.value);
            delimData = getNextDelimiter(content, strData.endIndex + 1);

            if (delimData.index >= 0 && delimData.delimiter === ":") {
              var parsedChildResult = parseJSON(content, delimData.index + 1);
              if (parsedChildResult) {
                newObject[strData.value] = parsedChildResult.value;
                delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1);
                //Scripter.Log("Next delimiter in object: " + delimData.delimiter);
                continue;
              } else {
                throw {
                  message: "Failed to parse object.",
                    snippet: getSnippet(content, delimData.index)
                }
              }
            } else {
              throw {
                message: "Failed to find \":\" in field.",
                  snippet: getSnippet(content, delimData.index)
              }
            }
          } else {
            throw {
              message: "Failed to parse string.",
                snippet: getSnippet(content, delimData.index)
            }
          }
        } else if(delimData.delimiter === ",") {

        }

        delimData = getNextDelimiter(content, delimData.index + 1);
      }

      value = {
        value: newObject,
        endIndex: delimData.index
      }
    } else if (delimData.delimiter === "[") {
      // Return an array.
      var newArray = [];
      var lastWasComma = false;
      var skipComma = false;

      var lastIndex = delimData.index + 1;
      delimData = getNextDelimiter(content, lastIndex);
      while (delimData.index >= 0 && delimData.delimiter !== "]") {
        // Parse values.
        if (delimData.delimiter === "\"") {
          var strData = extractString(content, delimData.index);

          if (strData) {
            //Scripter.Log("JSON extracted string in array: " + strData.value);
            newArray.push(strData.value);
            delimData = getNextDelimiter(content, strData.endIndex + 1);
            //Scripter.Log("Next delimiter in array: " + delimData.delimiter);
            lastIndex = strData.endIndex + 1;
            lastWasComma = false;
            skipComma = true;
            continue;
          } else {
            throw {
              message: "Failed to parse string.",
                snippet: getSnippet(content, delimData.index)
            }
          }
        } else if (delimData.delimiter === "{" || delimData.delimiter === "[") {
          var parsedChildResult = parseJSON(content, delimData.index);
          if (parsedChildResult) {
            newArray.push(parsedChildResult.value);
            delimData = getNextDelimiter(content, parsedChildResult.endIndex + 1);
            //Scripter.Log("Next delimiter in array: " + delimData.delimiter);
            lastIndex = parsedChildResult.endIndex + 1;
            lastWasComma = false;
            skipComma = true;
            continue;
          } else {
            throw {
              message: "Failed to parse object.",
                snippet: getSnippet(content, delimData.index)
            }
          }
        } else if (delimData.delimiter === ",") {
          if (!skipComma) {
            var length = delimData.index - lastIndex;
            if (length > 0) {
              var strValue = content.substr(lastIndex, length);
              newArray.push(strValue);
            }
          }

          lastIndex = delimData.index + 1;
          lastWasComma = true;
          skipComma = false;
        }

        delimData = getNextDelimiter(content, delimData.index + 1);
        //Scripter.Log("Next delimiter default: " + delimData.delimiter);
      }

      if (lastWasComma) {
        var length = delimData.index - lastIndex;
        if (length > 0) {
          var strValue = content.substr(lastIndex, length);
          newArray.push(strValue);
        }
      }

      value = {
        value: newArray,
        endIndex: delimData.index
      }
    } else if (delimData.delimiter === "," || delimData.delimiter === "}" || delimData.delimiter === "]") {
      var length = delimData.index - index;
      if (length > 0) {
        var strValue = content.substr(index, length);

        value = {
          value: strValue,
          endIndex: (delimData.index - 1)
        }
      } else {
        value = "";
      }
    }
  }

  return value;
}

