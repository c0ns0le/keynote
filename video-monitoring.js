Scripter.Logging = 1;

// ====
// Variables
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)';
var manifestBaseUrl = "http://edge3.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var filetype = 'mp4';


// ====
// Functions
var checkResponse = function(url) {
  if(typeof url == 'string') {
    Scripter.Log ("Fetching url: " + url);
    if(!KNWeb.Get(url)) {
      Scripter.SetError(-90404, true);
      KNWeb.SetErrorDetails(-90404, "** ERROR: Failed to get content for url: " + url);
    }
  }
  //Scripter.Log("Checking response header for " + KNWeb.GetURL(0));
  header = KNWeb.GetResponseHeaders(0);
  Scripter.Log("Received a response of '" + header.match(/[^\r\n]*/) + "'.");
  if(!/200/.test(header)) {
    Scripter.SetError(-99102, true);
    KNWeb.SetErrorDetails(-99102,"Did not respond with code 200" + contentId,"","","");
  }

}

// NOTE: untested and unused until December 2012 (?)
var checkVideoResponse = function(url) {
  checkResponse(url);
  var header = KNWeb.GetResponseHeaders(0);
  var regexs = new Array(/Content-Length: (\d+)/, /Content-Type: ([^\r\n ;]*)/);

  // check for content-length and content-type
  for(i in regexs) {
    var regex = regexs[i];

    if(!regex.test(header)) {
      Scripter.SetError(-90400, true);
      KNWeb.SetErrorDetails(-90400, "Header information not found in the header", "", "", "");
    }
    response = header.match(regex)[1];
    if(response.length < 1) {
      Scripter.SetError(-90411, true);
      KNWeb.SetErrorDetails(-90411, "Server did not reply information to the header request", "", "", "");
    }

    // Checking content-length is more than 1000k
    if(i==0 && parseInt(response) < 1000) {
      Scripter.SetError(-90411, true);
      KNWeb.SetErrorDetails(-90411, "Content size is not big enough to be a video. (Reported "+response+")", "", "", "");
    }

    // Checking content-type
    if(i==1 && ! /video/.test(response)) {
      Scripter.SetError(-90415, true);
      KNWeb.SetErrorDetails(-90415, "Content type is not a video. (Reported "+response+")", "", "", "");
    }
  }

}

// ====
// Script
var content = KNWeb.GetContent(0);
checkResponse();

Scripter.Log("Response content length: " + content.length);
var contentIds = new Array();
var videoUrls = new Array();
var match = content.match(new RegExp(contentIdRegexp, 'gi'));

if(!match) {
  Scripter.SetError(-99503, true);
  KNWeb.SetErrorDetails(-99503, "No matching video ids found!");
}

Scripter.Log("\nFound " + match.length + " video ids");

// Parsing through the pano definition
regex = new RegExp(contentIdRegexp);
for(i=0; i<match.length; i++) {
  contentId = match[i].match(regex)[1];
  Scripter.Log("Video id: " + contentId);
  contentIds.push(contentId);
}

// Fetching manifests
regex = new RegExp('http[^"]*\.'+filetype, 'gi');
Scripter.Log("\nProcessing " + contentIds.length + " manifests");
for(j in contentIds) {
  contentId = contentIds[j];
  Scripter.Log("\nFetching manifest for: " + contentId);

  checkResponse(manifestBaseUrl + contentId);
  matchedUrls = KNWeb.GetContent(0).match(regex);
  for(i=0; i<matchedUrls.length; i++) {
    Scripter.Log("Found video url: " + matchedUrls[i]);
    videoUrls.push(matchedUrls[i]);
  }
}

if(videoUrls.length < 1) {
  Scripter.SetError(-99215, true);
  KNWeb.SetErrorDetails(-99215, "No mp4 urls found in " + KNWeb.GetUrl(0));
}

// Fetching HEAD for videos
// NOTE Once HEAD requests are supported by MSN, the test should pass
Scripter.Log("\nProcessing " + videoUrls.length + " videos");
for (j in videoUrls) {
  url = videoUrls[j];
  Scripter.Log("\nRequesting HEAD information for: " + url);
  if(!KNWeb.Head(url)) {
    Scripter.SetError(-90400, true);
    KNWeb.SetErrorDetails(-90400,"Cannot get header for: " + url,"","","");
  }
  checkResponse();
}
