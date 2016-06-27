var TimingVariable; //= setInterval(myTimer, 1000);
document.addEventListener(
	'DOMContentLoaded',
	function() {
	  setInterval(myTimer, 1000);
	}
);
function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>"
	;
}
