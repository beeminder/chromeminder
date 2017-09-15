var languages = {
	"en": {
		META: { key: 'en' },
		"404 expected": "404 above is expected and normal ... silly chrome",
		"404: Check details try again" : "404: \nThere has been an error with the provided information. \nThe details have not been saved. \nPlease check of the details and try again.",
		"BareMin": "BareMin",
		"Beeminder Sever Says no": "Beeminder Sever Says no",
		"Credential Check": "Credential Check",
		"Data": "Data",
		"Data has been downloaded": "Data has been downloaded",
		"Deadline": "Deadline",
		"Default": "Default",
		"Difference ": "Difference ",
		"GOTO": "GOTO",
		"Goal data has been saved": "Goal data has been saved",
		"Graph Refreshed": ( i, u ) => `Graph Refreshed ${ i } ${ u }`,
		"New goal data has been saved": "New goal data has been saved",
		"No Goals Available": "No Goals Available",
		"No Difference ": "No Difference ",
		"No Update,": ( i, d ) => `No Updated difference, giving it another swing, ${ i } ${ d }`,
		"Now": "Now",
		"OPTinit": "OPTinit",
		"Options": "Options",
		"Options saved.": "Options saved.",
		"Output Set": e => `Output Set : ${ e }`,
		"Past Deadline!": "Past Deadline!",
		"Refresh": "Refresh",
		"Refresh ": "Refresh ",
		"Refresh - Goal Update": "Refresh - Goal Update",
		"Server 404 error": "Server 404 error",
		"Settings": "Settings",
		"Start": "Start",
		"Target": "Target",
		"The goal seems not to have updated, aborting refresh": "The goal seems not to have updated, aborting refresh",
		"There be no data": "There be no data",
		"Waiting for Graph to refresh": "Waiting for Graph to refresh",
		"You need to enter your details in the options page ": "You need to enter your details in the options page ",
		"LastUpdate": string => `Last update ${ string } ago`,
		"xhr Handler ": "xhr Handler "
	},
	// "fr": {}, // French
	// "cy": {} // Welsh - Cymraeg
};
languages[ "en-us" ] = languages[ "en-gb" ] = languages.en;

var userLanguage,
	navLangs = navigator.languages,
	supportedLanguages = Object.keys( languages );

localisationInitaliser();

/**
 * Initialises userLanguage based on navigator.languages
 */
function localisationInitaliser() {
	if ( !navLangs || navLangs.length === 0 )
		userLanguage = languages.en;

	else
		for ( var i = 0; i < navLangs.length; i++ )
			if ( supportedLanguages.indexOf( navLangs[ i ] ) !== -1 )
				userLanguage = languages[ navLangs[ i ] ];

	if ( !userLanguage ) {
		console.warn(
			`These laguages are not supported : [ ${ navLangs } ]\n`
			+ `Defaulting to English ( en )`
		);

		userLanguage = languages.en;
	}

	// TODO: Pass over secondry language keys and find missing proerties
	// TODO: Give ability to choose language in options
}

/**
 * internationalisation handler
 * @function _i
 * @param {string} key
 * @param {*} args
 */
function _i( key, ...args ) {
	if ( !key ) {
		console.error( new Error( `${ key } is invalid` ) );

		return '';
	}

	if ( !( key in userLanguage ) ) {
		console.warn( `${ key }\nis not present in ${ userLanguage.META.key }` );

		return key;
	}

	var target = userLanguage[ key ];

	if ( typeof target === 'string' )
		return target;

	if ( typeof target === 'function' ) {
		var argslen = args.length;
		var targetlen = target.length;

		if ( argslen !== targetlen ) {
			console.error( new Error(
				`lang() has been supplied ${ argslen } arguments for a localisation function that requires ${ targetlen } arguments`
			) );

			return '';
		}

		return target( ...args );
	}
}
