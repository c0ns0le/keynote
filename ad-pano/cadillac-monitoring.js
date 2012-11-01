/**
 * Cloud Pano (Cadillac) Monitoring
 **/

Scripter.Logging = 1;

var errorLog = [];
var errorSummary = '';
var response = '';
var links = [];

// ====
// Functions

/**
 * Performs a HEAD or GET request
 * @param url(string): url to request
 * @param request(string): 'get' or 'head' request
 * @return content string if GET request is successful
 * @return boolean if HEAD request or GET is unsuccessful
 **/
var fetchContent = function(url, request) {
  request = typeof request == 'undefined'? 'get' : request;

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

  header = KNWeb.GetResponseHeaders(0);
  response = header;
  resp = header.match(/[^\r\n]*/);
  if(resp) {
    Scripter.Log("Received a response of '" + resp + "'.");
  }
  else {
    Scripter.Log("No header response!");
    return false;
  }

  // TODO check content-length if there is one

  if(/get/i.test(request) && /200/.test(header)) {
    return KNWeb.GetContent(0);
  }
  return /200/.test(header);
}

// ====
// Script

for(j=0;j<20;j++) {
  num = j==0? '' : j;
  url = "http://en-us.appex-rf.msn.com/cp/v1/en-us/Ad/cadillacATS" + num + ".js";

  panoJs = fetchContent(url);
  panoJs = panoJs.replace(/\\\//gm, '/');
  Scripter.Log("Response content length: " + panoJs.length);

  panoLinks = panoJs.match(/http:\/\/[\w\d\.\-\/]*/gi);
  if(!panoLinks) {
    Scripter.SetError(-99501, true);
    KNWeb.SetErrorDetails(-99501, "No URLs found! Is JSON empty?");
  }
  Scripter.Log("Found " + panoLinks.length + " links.");
  for(i in panoLinks) {
    //Scripter.Log(+i+1 + ". " + panoLinks[i]);
    if(/^http/.test(panoLinks[i])) {
      links[panoLinks[i]] = '';
    }
  }
}

Scripter.Log("\nProcessing requests.");
for(link in links) {
  if(!fetchContent(link, 'head')) {
    errorLog.push("Head request for " + link + " failed. Response is " + response);
    errorSummary += link + ' ';
    break; // TODO have to error out; keynote bug -- keynote is now in a failed state and won't continue making requests
  }
}

// Display all the errors
Scripter.Log("\n\n========\nError Log - " + errorLog.length + "\n========");
if(errorLog.length < 1) {
  Scripter.Log("None.");
}
else {
  for(i in errorLog) {
    Scripter.Log(errorLog[i]);
  }
}

if(errorLog.length > 0) {
  Scripter.Log("Summary: " + errorSummary);
  Scripter.SetError(-90404, true);
  KNWeb.SetErrorDetails(-90404, "ERRORS: " + errorSummary);
}

//*/
