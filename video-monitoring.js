Scripter.Logging = 1;

// ====
// Variables
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)';
var manifestBaseUrl = "http://edge%ENDPOINT%.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var numManifestServers = 5;
var formatCode = ['1002', '103'];
var filetype = 'mp4';

var errors = [];


// ====
// Functions

/**
 * TODO description
 **/
var fetchContent = function(url, request) {
  request = typeof request == 'undefined'? 'get' : request;

  if(typeof url != 'string') {
    // TODO programming error
  }
  if(typeof request != 'string' && /(get|head)/i.test(request)) {
    // TODO programming error
  }

  if(/head/i.test(request)) {
    Scripter.Log("Issuing HEAD request for: " + url);
    if(!KNWeb.Head(url)) {
      Scripter.SetError(-90400, true);
      KNWeb.SetErrorDetails(-90400,"Cannot get header for: " + url,"","","");
    }
  }
  else {
    Scripter.Log ("Issuing GET request for: " + url);
    if(!KNWeb.Get(url)) {
      Scripter.SetError(-90404, true);
      KNWeb.SetErrorDetails(-90404, "** ERROR: Failed to get content for url: " + url);
    }
  }

  header = KNWeb.GetResponseHeaders(0);
  Scripter.Log("Received a response of '" + header.match(/[^\r\n]*/) + "'.");
  /*
  if(!/200/.test(header)) {
    Scripter.SetError(-99102, true);
    KNWeb.SetErrorDetails(-99102,"Did not respond with code 200" + contentId,"","","");
  }
  */

  if(/get/i.test(request) && /200/.test(header)) {
    return KNWeb.GetContent(0);
  }
  return /200/.test(header);
}

/**
 * Get a random endpoint from 1 to max, inclusive
 * @param baseUrl (string): url with %ENDPOINT% to hit a random MSN server
 * @return: random url
 **/
// TODO better description
var fetchManifestUrl = function(baseUrl) { 
  serverEndpoint = Math.floor((Math.random()*numManifestServers)+1);
  return manifestBaseUrl.replace("%ENDPOINT%", serverEndpoint);
}

/**
 * Fetch video urls specified by format code.
 * @param manifestUrl (string): url to MSN manifest
 * @param format (undefined, string, array): format code to the video to check
 * If format === undefined, all video urls in manifest will be returned
 * @return: an array of video urls
 * TODO update description
 **/
var verifyManifest = function(manifestUrl, format) {
  format = typeof format === 'undefined'? ['*'] : format;
  format = typeof format === 'string'? [format] : format;
  if(! format instanceof Array) {
    // TODO programming error
  }
  content = fetchContent(manifestUrl);

  if(typeof content == 'boolean') {
    // TODO error - trouble downloading manifest
  }

  Scripter.Log("Processing format(s): " + format);
  for(i=0; i<format.length; i++) {
    regex = new RegExp('<videoFile formatCode="' + format[i] + '".*?<\/videoFile>', 'gim');
    videoFiles = content.match(regex);

    if(!videoFiles) {
      Scripter.Log("** FAILED on format " + format[i] + ". Logging error");
      errors.push("Manifest " + manifestUrl + " does not have video content for format code " + format[i]);
      continue;
    }

    for(j=0; j<videoFiles.length; j++) {
      regex = new RegExp('http[^"]*\.' + filetype, 'gi');
      videoUris = videoFiles[j].match(regex);

      if(!videoUris) {
        Scripter.Log("** FAILED on format " + format[i] + ". Logging error");
        errors.push("Manifest " + manifestUrl + " does not have video content for format code " + format[i]);
        continue;
      }

      for(k=0; k<videoUris.length; k++) {
        Scripter.Log("Found video url for format " + format[i] + ": " + videoUris[k]);
        fetchContent(videoUris[k], 'head');
      }
    }
  }
}

// ====
// Script
var content = fetchContent(KNWeb.GetURL(0));

Scripter.Log("Response content length: " + content.length);
var contentIds = new Array();
var match = content.match(new RegExp(contentIdRegexp, 'gi'));

if(!match) {
  Scripter.SetError(-99503, true);
  KNWeb.SetErrorDetails(-99503, "No video ids found in the supplied pano definition!");
}

Scripter.Log("\nFound " + match.length + " video ids");

// Parsing through the pano definition
regex = new RegExp(contentIdRegexp);
for(i=0; i<match.length; i++) {
  contentId = match[i].match(regex)[1];
  Scripter.Log("Video id: " + contentId);
  contentIds.push(contentId);
}

// Processing manifests
regex = new RegExp('http[^"]*\.'+filetype, 'gi');
Scripter.Log("\nProcessing " + contentIds.length + " manifests");
for(j in contentIds) {
  contentId = contentIds[j];
  Scripter.Log("\nFetching manifest for: " + contentId);

  manifestUrl = fetchManifestUrl(manifestBaseUrl) + contentId;
  response = verifyManifest(manifestUrl, formatCode);
}

// Display all the errors
// TODO find an appropriate error number
if(errors.length > 0) {
  Scripter.Log("\n\n========\nError Log\n========\n");
  for(i in errors) {
    Scripter.Log(+i+1 + ") " + errors[i]);
  }
  Scripter.SetError(-99503, true);
  KNWeb.SetErrorDetails(-99503, "No video ids found in the supplied pano definition!");
}
