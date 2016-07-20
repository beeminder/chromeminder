chrome.omnibox.onInputStarted.addListener(function (){
	//
})
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
    console.log('inputChanged: ' + text);
    suggest([
      {content: "GOTO", description: "Go To a goal page"},
      {content: "ADD", description: "Add a data point"},
      {content: "NEW", description: "Make a new goal"},
      {content: "QUICK", description: "Show some quick info on a Goal"}
    ]);
  })
chrome.omnibox.onInputEntered.addListener(function (text) {
    console.log('inputEntered: ' + text);
    alert('You just typed "' + text + '"');
  })
chrome.omnibox.onInputCancelled.addListener(function (){
	//
})
