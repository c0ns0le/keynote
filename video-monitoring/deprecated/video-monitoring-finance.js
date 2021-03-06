/**
 * Sample script for Appex video live site monitoring
 * 
 * Known issues:
 * - When a manifest file fails to download, the script halts and does not proceed checking other videos.
 *   This is a bug with Keynote.
 **/

Scripter.Logging = 1;

// ====
// Variables
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)';
var manifestBaseUrl = "http://edge%ENDPOINT%.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var numManifestServers = 5;       // number of catalog server endpoints
var formatCode = ['1002', '103']; // format codes specified by MSN and used in the apps
var filetype = '(mp4|wmv)';       // video filetype to check for in the manifest

var errorLog = [];
var errorSummary = '';
var content = '';
var contentIds = [];
var contentTitles = {};


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
  Scripter.Log("Received a response of '" + header.match(/[^\r\n]*/) + "'.");

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

/**
 * Gets the title of the video, given the manifest content
 * @param content(string): the manifest XML
 * @return title of the video, if one is found. Else 'NA' is returned.
 **/
var getTitle = function(content) {
  regex = new RegExp('<title>(.*?)<\/title>', 'im');
  title = content.match(regex);
  if(!title || title.length != 2) {
    return 'NA';
  }
  return title[1].replace(/^\s+|\s+$/g, '');
}

/**
 * Get contentID from manifest url
 * @param url(string): manifest url
 * @return content id
 **/
var getContentId = function(url) {
  match = url.match(/uuid=([0-9a-zA-Z-]*)/i);
  if(!match) { return ''; }
  return match[1];
}

/**
 * Using the given manifest url, perform HEAD request on the videos with specified format code
 * @param manifestUrl(string): url to manifest server
 * @param format(undefined, string, array): format code to the video to check
 *        If format is undefined, all video urls in manifest will be returned
 * @return boolean if there were errors
 **/
var verifyVideosInManifest = function(manifestUrl, format) {
  failed = true;
  parsingError = false;
  format = typeof format === 'undefined'? ['*'] : format;
  format = typeof format === 'string'? [format] : format;
  content = fetchContent(manifestUrl);

  if(typeof content == 'boolean') {
    Scripter.Log("** FAILED on downloading manifest file");
    errorLog.push("**ERROR**\tManifest file missing - " + manifestUrl);
    errorSummary += ' Manifest ' + getContentId(manifestUrl) + ' missing!';
    return failed;
  }

  Scripter.Log("Processing format(s): " + format);
  for(i=0; i<format.length; i++) {
    regex = new RegExp('<videoFile formatCode="' + format[i] + '".*?<\/videoFile>', 'gim');
    videoFiles = content.match(regex);

    // If there's no matching block
    if(!videoFiles) {
      Scripter.Log("*** FAILED on format " + format[i] + ".");
      errorLog.push("**WARNING**\tManifest " + manifestUrl + " does not have format code " + format[i]);
      continue;
    }

    // If there's more than one matching block (there shouldn't)
    if(videoFiles.length != 1) {
      Scripter.Log("** PARSING ERROR on manifest " + manifestUrl);
      errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl);
      errorSummary += ' Error parsing manifest ' + getContentId(manifestUrl);
      parsingError = true;
      break;
    }
    else {
      regex = new RegExp('http[^"]*\.' + filetype, 'gi');
      videoUris = videoFiles[0].match(regex);

      // If there's no matching block
      if(!videoUris) {
        Scripter.Log("*** FAILED on finding a matching video for format " + format[i] + ".");
        errorLog.push("**WARNING**\tNo " + filetype + " file for format code " + format[i] + " in manifest " + manifestUrl);
        parsingError = true;
        continue;
      }

      // If there's more than one matching block (there shouldn't)
      if(videoUris.length != 1) {
        Scripter.Log("** PARSING ERROR on manifest " + manifestUrl);
        errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl);
        errorSummary += ' Error parsing manifest ' + getContentId(manifestUrl);
        parsingError = true;
        break;
      }
      else {
        Scripter.Log("Found video url for format " + format[i] + ": " + videoUris[0]);
        fetchContent(videoUris[0], 'head');
      }
    }
    failed = false;
  }

  // if videos all fail in the manifest, raise the error level
  if(failed) {
    for(i=0; i<format.length; i++) {
      errorLog.pop();
    }
    errorLog.push("**ERROR**\tManifest " + manifestUrl + " does not have format code(s) " + format);
    errorSummary += ' Format ' + format + ' for ' + getContentId(manifestUrl);
  }

  return failed | parsingError;
}

// ====
// Script
var content = fetchContent(KNWeb.GetURL(0));

Scripter.Log("Response content length: " + content.length);
var titles = [];
var match = content.match(new RegExp(contentIdRegexp, 'gi'));

if(!match) {
  Scripter.SetError(-99501, true);
  KNWeb.SetErrorDetails(-99501, "No video ids found in the supplied pano definition!");
}

Scripter.Log("\nFound " + match.length + " video ids");

// Parsing through the pano definition
var regex = new RegExp(contentIdRegexp);
for(i=0; i<match.length; i++) {
  contentId = match[i].match(regex)[1];
  Scripter.Log("Video id: " + contentId);
  contentIds.push(contentId);
}

// Processing manifests
regex = new RegExp('http[^"]*\.'+filetype, 'gi');
Scripter.Log("\nProcessing " + contentIds.length + " manifests");
var errors = false;
for(j in contentIds) {
  contentId = contentIds[j];
  Scripter.Log("\n---- #" + (+j+1) + " manifest ----");
  Scripter.Log("Fetching manifest for: " + contentId);

  manifestUrl = fetchManifestUrl(manifestBaseUrl) + contentId;
  manifestError = verifyVideosInManifest(manifestUrl, formatCode);
  errors |= manifestError;
  if(manifestError) {
    continue;
  }
  contentTitles[contentId] = getTitle(content);
}

// Print out all mappings
Scripter.Log("\n\n========\nContentID Mapping\n========");
for(i in contentTitles) {
  Scripter.Log(i + "\t" + contentTitles[i]);
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

if(errors) {
  Scripter.Log("Summary: " + errorSummary);
  Scripter.SetError(-99215, true);
  KNWeb.SetErrorDetails(-99215, "ERRORS: " + errorSummary);
}
