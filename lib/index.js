
module.exports = {
	Translator: require('./translator'),
	Bundle: require('./bundle'),
	LocalizedString: require('./localizedstring'),
	nls: {
		Reader: require('./nls/reader'),
		Writer: require('./nls/writer')
	},
  util: require('./util')
};