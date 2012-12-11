Scripter.Logging = 1;
var tPass = true;

// ==
// Variables
var monitoredEndpoint = 'http://en-us.appex-rf.msn.com/cg/v3/EN-US/news/Reuters_videos.js';
var contentIdRegexp = '\/view\\?entitytype=video\&contentId=([^"&]*)';
var manifestBaseUrl = "http://edge3.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var filetype = 'mp4';
var minVideoSize = 1;
var _defaultCatalogPrefix = "http://edge1.catalog.video.msn.com/videobyuuid.aspx?uuid=";
var _videoCatalogEndpoints = [
"http://edge1.catalog.video.msn.com/videobyuuid.aspx?uuid=",
"http://edge2.catalog.video.msn.com/videobyuuid.aspx?uuid=",
"http://edge3.catalog.video.msn.com/videobyuuid.aspx?uuid=",
"http://edge4.catalog.video.msn.com/videobyuuid.aspx?uuid=",
"http://edge5.catalog.video.msn.com/videobyuuid.aspx?uuid="
];

// ====
// Functions
var checkResponse = function(url) {
  if(typeof url == 'string') {
    //Scripter.Log ("Fetching url: " + url);
    if(!KNWeb.Get(url)) {
      Scripter.SetError(-90404, true);
      KNWeb.SetErrorDetails(-90404, "** ERROR: Failed to get content for url: " + url);
    }
  }
}

// Get the url for the video server
// This uses the same logic for picking the edge server as mediaPlayback.js
function getNextCatalogPrefix () {
    if (_videoCatalogEndpoints.length > 0) {

        // pick a random endpoint 
        var randomNumber = Math.floor(Math.random() * 100000) + 10000;

        var endpointIndex = randomNumber % _videoCatalogEndpoints.length;
        var catalogEntry = _videoCatalogEndpoints[endpointIndex];

        if (catalogEntry) {
            return catalogEntry;
        }
    }

    return _defaultCatalogPrefix;
}

function verifyVideoEndpoint (uuid) {
   var url = getNextCatalogPrefix() + uuid;
   checkResponse(url);
   
  var respBody = KNWeb.GetContent(0);
  var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
  xmlDoc.async="false";
  xmlDoc.loadXML(respBody);

  try
  {
    var videoNode = xmlDoc.getElementsByTagName('videoFile');
    var uri;
      var i, j;

    //Video file check start
    for(i= 0; i < videoNode.length; i++)
    {
      if (videoNode && videoNode[i]) 
      {
        uri = videoNode[i].getElementsByTagName('uri');
        if(uri && uri.length > 0) 
        {     
          for(j=0; j<uri.length; j++)
          {
            if (uri[0].childNodes[0].nodeValue.indexOf(".mp4")!=-1)
            {
              var passed = KNWeb.Head(uri[0].childNodes[0].nodeValue);

              if (passed)
              {
                Scripter.Log("Head Request: " + passed + " " + "URI: " + uri[0].childNodes[0].nodeValue);
              }
              else
              {
                Scripter.Log("Reuters en-US [ERROR] - Head request failed in Video URI: " + uri[0].childNodes[0].nodeValue);
                tPass = false; 
              }
            }
            
          }
        }
        else
        {
          Scripter.Log("Reuters en-US [ERROR] - Video file missing in URI: " + uri[0].childNodes[0].nodeValue);
          tPass = false; 
        }
      }
    }
    //Video file check end
  }
  catch(e)
  {
      Scripter.Log("Reuters en-US Exception during execution: " + e.message);
      Scripter.SetError(-71200, true);
      KNWeb.SetErrorDetails(-71200, "Reuters en-US Exception during execution: " + e, "", "", "");
      EndAction();
  }
 }

function getVideoUUIDs(responseString) {
  var videosUUIDsArray = [];

  var respJson = eval('(' + responseString + ')');
  var clusters = respJson["clusters"];
  if(!clusters){
    Scripter.SetError(-71200,true);
    KNWeb.SetErrorDetails(-71200,"There is no clusters node.","","","");
    EndAction();
  }
  for (var c in clusters){
    var entityList = clusters[c]["entityList"];
    if (entityList) {
      if (entityList["entities"]){
        for (var e in entityList["entities"]){
          var destination = clusters[c]["entityList"]["entities"][e]["destination"];
          if (destination){
            var match = destination.match(new RegExp(contentIdRegexp, 'gi'));
            if(!match) {
              Scripter.SetError(-99503, true);
              KNWeb.SetErrorDetails(-99503, "No matching video ids found for destination "+destination);
            }
            regex = new RegExp(contentIdRegexp);
            for(i=0; i<match.length; i++) {
              var contentId = match[i].match(regex)[1];
              videosUUIDsArray.push(contentId);
            }
          }
        }
      }
    } else {
      Scripter.SetError(-71200,true);
      KNWeb.SetErrorDetails(-71200,"There is no entityList node.","","","");
      EndAction();
    }
  }
  //Scripter.log("Final UUIDs array:"+videosUUIDsArray.join("\n"));
  return videosUUIDsArray;
}



// ====
// Script
var content = KNWeb.GetContent(0);
var videoUUIDsArray = getVideoUUIDs(content);
for (i = 0; i < videoUUIDsArray.length; i++){
  verifyVideoEndpoint(videoUUIDsArray[i]);
}

if(!tPass)
{
    Scripter.SetError(-71200, true);
    KNWeb.SetErrorDetails(-71200, "Reuters en-US Exception during execution: " + e, "", "", "");
}
else
{ 
  Scripter.Log("Test Passed");  
}
