/**
 * Cloud Pano (Cadillac) Monitoring
 **/

Scripter.Logging = 1;

var errorLog = [];
var errorSummary = '';
var respCode = '';

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
  respCode = header;
  resp = header.match(/[^\r\n]*/);
  if(resp) {
    Scripter.Log("Received a response of '" + resp + "'.");
  }
  else {
    Scripter.Log("No header response!");
  }

  if(/get/i.test(request) && /200/.test(header)) {
    return KNWeb.GetContent(0);
  }
  return /200/.test(header);
}

/**
 * Chooses a random manifest endpoint from 1 to max, inclusive
 * @param baseUrl(string): url with %ENDPOINT% to hit a random server serving manifests.
 * @return random url
 **/
var fetchManifestUrl = function(baseUrl) { 
  serverEndpoint = Math.floor((Math.random()*numManifestServers)+1);
  return manifestBaseUrl.replace("%ENDPOINT%", serverEndpoint);
}

// ====
// Script
url = "http://en-us.appex-rf.msn.com/cp/v1/en-us/Ad/cadillacATS.js";

panoJs = fetchContent(KNWeb.GetUrl(0));
panoJs = panoJs.replace(/\\\//gm, '/');
Scripter.Log("Response content length: " + panoJs.length);

panoLinks = panoJs.match(/http:\/\/[\w\d\.\-\/]*/gi);
if(!panoLinks) {
  Scripter.SetError(-99501, true);
  KNWeb.SetErrorDetails(-99501, "No URLs found! Is JSON empty?");
}
Scripter.Log("Checking " + panoLinks.length + " links: ");
for(i in panoLinks) {
  Scripter.Log(+i+1 + ". " + panoLinks[i]);
}

for(i=0; i<panoLinks.length; i++) {
  if(!fetchContent(panoLinks[i], 'head')) {
    errorLog.push("Head request for " + panoLinks[i] + " failed. Response is " + respCode);
    errorSUmmary += panoLinks[i] + ' ';
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
  Scripter.SetError(-99215, true);
  KNWeb.SetErrorDetails(-99215, "ERRORS: " + errorSummary);
}

//*/
