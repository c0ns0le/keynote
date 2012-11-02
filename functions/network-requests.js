/**
 * Performs a HEAD or GET request
 * @param url(string): url to request
 * @param request(string): 'get' or 'head' request
 * @return content string if GET request is successful
 * @return boolean if HEAD request or GET is unsuccessful
 **/
var fetchContent = function(url, request) {
  var request = typeof request == 'undefined'? 'get' : request;

  if(/head/i.test(request)) {
    Scripter.Log("Issuing HEAD request for: " + url);
    KNWeb.Head(url);
  }
  else {
    Scripter.Log ("Issuing GET request for: " + url);
    // TODO has to fail here, Keynote sucks
    if(!KNWeb.Get(url)) {
      Scripter.SetError(-90404, true);
      KNWeb.SetErrorDetails(-90404, "** ERROR: Failed to get content for url: " + KNWeb.GetURL(0));
    }
  }

  var header = KNWeb.GetResponseHeaders(0);
  var resp = header.match(/[^\r\n]*/);
  if(resp) {
    Scripter.Log("Received a response of '" + resp + "'.");
  }
  else {
    Scripter.Log("No header response!");
    return false;
  }

  if(/get/i.test(request) && /200/.test(header)) {
    return KNWeb.GetContent(0);
  }
  return /200/.test(header);
}
