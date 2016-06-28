var TimingVariable; //= setInterval(myTimer, 1000);
var UName, slug, LinkRefresh, LinkDatapoints, LinkSettings;
var BeeURL = "https://www.beeminder.com/";
document.addEventListener('DOMContentLoaded', PUinit);

UName="OiYouYeahYou";
slug="writing";

function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>";
}

function PUinit(){ //
	TimingVariable = setInterval(myTimer, 1000);
	document.getElementById('OptLink').addEventListener(
		'click', OTab
	);
	document.getElementById('UserSelector').addEventListener(
		'click', GOTO
	);
}
function OTab(){
	chrome.tabs.create({'url': '/options.html' } )
}
function GOTO(loc){
	if (loc == undefined){loc=""}
	link = BeeURL + UName + "/" + slug + "/" + loc
	chrome.tabs.create({'url': link } )
	alert("hmm")
}
/*
GOTO
Refresh
data-points
Settings
Options






*/
