/* ==================
 * Video monitoring
 * Provided by William Chen
 * ================== */

// ====
// Variables
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)';
var manifestBaseUrl = "http://edge%ENDPOINT%.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var numManifestServers = 5;       // number of catalog server endpoints
var formatCode = ['1002', '103']; // format codes specified by MSN and used in the apps
var filetype = '(mp4|wmv)';       // video filetype to check for in the manifest


var setError = function(errorCode, description) { Scripter.Log(description); Scripter.SetError(errorCode, true); KNWeb.SetErrorDetails(errorCode, description); }
var isNull = function(obj) { return typeof obj == 'undefined'; }
var checkNull = function(obj, description) { if(isNull(obj)) { setError(-90404, description + " is null"); } }
var isEmptyOrNull = function(obj) { if(isNull(obj)) { return true; } if(typeof obj == 'string' && obj == '') { return true; } return false; }

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
  format = typeof format === 'undefined'? ['*'] : format;       // FIXME
  format = typeof format === 'string'? [format] : format;
  content = fetchContent(manifestUrl);

  if(isEmptyOrNull(content)) {
    Scripter.Log("** FAILED on downloading manifest file");
    errorLog.push("**ERROR**\tManifest file missing - " + manifestUrl);
    errorSummary += ' Manifest ' + getContentId(manifestUrl) + ' missing!';
    return failed;
  }

  Scripter.Log("Processing format(s): " + format);
  for(var i=0; i<format.length; i++) {
    regex = new RegExp('<videoFile formatCode="' + format[i] + '".*?<\/videoFile>', 'gim');
    videoFiles = content.match(regex);

    // If there's no matching block
    if(!videoFiles) {
      Scripter.Log("*** FAILED on format " + format[i] + ".");
      errorLog.push("**WARNING**\tManifest " + manifestUrl + " does not have format code " + format[i]);
      continue;
    }

    // If there's more than one matching block (there shouldn't)
    if(videoFiles.length != 1 && format[i] != '*' ) {
      Scripter.Log("** PARSING ERROR on manifest " + manifestUrl);
      errorLog.push("**ERROR**\tParsing error on manifest " + manifestUrl);
      errorSummary += ' Error parsing manifest ' + getContentId(manifestUrl);
      parsingError = true;
      break;
    }

    for(var j=0; j<videoFiles.length; j++) {
      regex = new RegExp('http[^"]*\.' + filetype, 'gi');
      videoUris = videoFiles[j].match(regex);

      // If there's no matching block
      if(!videoUris) {
        Scripter.Log("*** FAILED on finding a matching video for format " + format[i] + ".");
        errorLog.push("**WARNING**\tNo " + filetype + " file for format code " + format[i] + " in manifest " + manifestUrl);
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
        if(isEmptyOrNull(fetchContent(videoUris[0], 'head'))) {
          errorLog.push("Head request for " + videoUris[0] + " failed. Error code " + KNWeb.ErrorNumber);
          errorSummary += KNWeb.ErrorNumber + ' ' + videoUris[0] + ' ';
          errors = true;
        }
      }
    }
    failed = false;
  }

  // if videos all fail in the manifest, raise the error level
  if(failed) {
    for(var i=0; i<format.length; i++) {
      errorLog.pop();
    }
    errorLog.push("**ERROR**\tManifest " + manifestUrl + " does not have format code(s) " + format);
    errorSummary += ' Format ' + format + ' for ' + getContentId(manifestUrl);
  }

  return failed || parsingError;
}
