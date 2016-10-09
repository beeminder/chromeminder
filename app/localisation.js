var LocalLang = {
	"en" : { // English
		xhr : {
			Status404 : "Server 404 error",
			StateChangeInfo : "xhr Handler "
		},
		Popup : {
			NavToOptions : "You need to enter your details in the options page ",
			ButtonGoal		: "GOTO",
			ButtonRefresh	: "Refresh",
			ButtonData		: "Data",
			ButtonSettings	: "Settings",
			OptLink			: "Options",
			Deadline		: "Deadline",
			BareMin			: "BareMin",
			OutputSet		: "Output Set : ",
			InfoDisplay	: {
				LastUpdate	:
					function(string){return "Last update " + string + " ago"},
				Start		:"Start",
				Now			:"Now",
				Target		:"Target"
			},
			Refresh : {
				RefreshCall : {
					Name : "Refresh ",
					UpdateSuccessful : "Waiting for Graph to refresh",
					UpdateNo : "Beeminder Sever Says no"
				},
				GoalGet : {
					Name : "Refresh - Goal Update",
					NoUpdate : "No Updated difference, giving it another swing,",
					TooManyTries : "The goal seems not to have updated, aborting refresh",
					NewDataSaved : "New goal data has been saved",
					GoalRefreshed : "Graph Refreshed "
				}
			},
			HandleDownload : {
				DataSaved : "Goal data has been saved",
				DataDownloaded : "Data has been downloaded"
			},
			ImageHandler : {
					NotAnError404 : "404 above is expected and normal ... silly chrome",
			},
			PastDeadline : "Past Deadline!</br>"
		},
		Options : {
			OPTinit : {
				NoUserData : "There be no data",
				xhrName : "OPTinit",
				NoDifference : "No Difference ",
				Difference : "Difference "
			},
			save_options : {
				xhrName : "Credential Check",
				OptionsSaved : "Options saved.",
				Message404 :
				"404: \nThere has been an error with the provided information. \nThe details have not been saved. \nPlease check of the details and try again."
			},
			Default : "Default"
		}
	},
	"en-gb" : {},
	"en-us" : {},
	"fr" : {}, // French
	"cy" : {} // Welsh - Cymraeg
}
LocalLang["en-us"] = LocalLang["en-gb"] = LocalLang.en
LocalLang["fr"] = LocalLang.en
LocalLang["cy"] = LocalLang.en
