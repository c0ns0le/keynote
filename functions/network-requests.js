var setError = function(errorCode, description) { Scripter.Log(description); Scripter.SetError(errorCode, true); KNWeb.SetErrorDetails(errorCode, description); }
var isNull = function(obj) { return typeof obj == 'undefined'; }
var checkNull = function(obj, description) { if(isNull(obj)) { setError(-90404, description + " is null"); } }
var isEmptyOrNull = function(obj) { if(isNull) { return true; } if(typeof obj == 'string' && obj == '') { return true; } return false; }

/**
 * Performs a HEAD or GET request
 * @param url(string): url to request
 * @param request(string): 'get' or 'head' request
 * @return content string if request is successful
 * @return empty string is request is not successful
 **/
var fetchContent = function(url, request) {
  var request = typeof request == 'undefined'? 'get' : request;
  var result;

  KNWeb.SessionRC = true;

  if(/head/i.test(request)) {
    Scripter.Log("Issuing HEAD request for: " + url);
    result = KNWeb.Head(url);
  }
  else {
    Scripter.Log ("Issuing GET request for: " + url);
    result = KNWeb.Get(url);
  }

  if(!result) { return ''; }

  var header = KNWeb.GetResponseHeaders(0);
  if(isEmptyOrNull(header)) { return '' }
  var resp = header.match(/[^\r\n]*/);
  if(!isEmptyOrNull(resp)) {
    Scripter.Log("Received a response of '" + resp + "'.");
  }
  else {
    Scripter.Log("No header response!");
    return '';
  }

  if(/get/i.test(request) && /200/.test(header)) {
    return KNWeb.GetContent(0);
  }
  return header;
}
