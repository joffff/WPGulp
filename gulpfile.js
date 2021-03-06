/**
 * Gulpfile.
 *
 * Edit values in gulp-config.json
 *
 *
 * Implements:
 *   1. Live reloads browser with BrowserSync.
 *   2. CSS: Sass to CSS conversion, error catching, Autoprefixing, Sourcemaps,
 *      CSS minification, and Merge Media Queries.
 *   3. JS: Concatenates & uglifies Vendor and Custom JS files.
 *   4. Watches files for changes in CSS or JS.  Watches for new files in CSS or JS.
 *   5. InjectCSS instead of browser page reload.
 *      
 * Inspired by / credit to:
 *   Gulp with WordPress: https://github.com/ahmadawais/WPGulp
 *   Gulp WP Toolkit: https://github.com/craigsimps/gulp-wp-toolkit
 *
 */


/**
 * Load Plugins.
 *
 * Load gulp plugins and passing them semantic names.
 */
var gulp         = require('gulp'); // Gulp of-course

// CSS related plugins.
var sass         = require('gulp-sass'); // Gulp pluign for Sass compilation.
var minifycss    = require('gulp-uglifycss'); // Minifies CSS files.
var autoprefixer = require('gulp-autoprefixer'); // Autoprefixing magic.
var bulkSass     = require('gulp-sass-bulk-import'); //https://www.npmjs.com/package/gulp-sass-bulk-import
var sourcemaps   = require('gulp-sourcemaps'); // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css)

// JS related plugins.
var concat       = require('gulp-concat'); // Concatenates JS files
var jshint       = require('gulp-jshint'); // Adds linting for JS
var minifyjs     = require('gulp-minify'); //https://www.npmjs.com/package/gulp-minify

// Utility related plugins.
var filter       = require('gulp-filter'); // Enables you to work on a subset of the original files by filtering them using globbing.
var streamqueue  = require('streamqueue'); //https://github.com/contra/gulp-concat
var notify       = require('gulp-notify'); // Sends message notification to you
var browserSync  = require('browser-sync').create(); // Reloads browser and injects CSS. Time-saving synchronised browser testing.
var reload       = browserSync.reload; // For manual browser reload.
var sort         = require('gulp-sort'); // Recommended to prevent unnecessary changes in pot-file.
var watch        = require('gulp-watch'); // Using gulp-watch as an alternative for the default gulp watcher - gulp-watch detects new files.
var JSONC        = require('json-comments'); // Parse JSON and strip out comments.  Allows non-standard JSON to be used for gulp-config.json.
var fs           = require('fs'); // Uses Node filesystem package.
var gulpif       = require('gulp-if'); // Adds conditional logic to control flow.
var rename       = require('gulp-rename'); // Adds conditional logic to control flow.

/**
 * Load config file.
 *
 * Load gulp settings from config file, or return error if file does not exist.
 */
var configFile = './gulp-config.json'; // The config file path.
var configContent; // Streamed contents of configFile.
var config = [];

// Test if config file exists.
try {
	// read in gulp config file.
	configContent = fs.readFileSync( configFile, 'utf8' );

	// parse JSON String.
	var config = JSONC.parse( configContent ); 
	

} catch (exp) {

	// Error if no config file is found.
	throw new Error("Please check the config file 'gulp-config.json' exists and has no errors.");
	
	// console.log( config );  // Output contents of config.
}


/**
 * Task: `browser-sync`.
 *
 * Live Reloads, CSS injections, Localhost tunneling.
 *
 * This task does the following:
 *    1. Sets the project URL
 *    2. Sets inject CSS
 *    3. You may define a custom port
 *    4. You may want to stop the browser from opening automatically
 */
gulp.task( 'browser-sync', function() {
	browserSync.init( {

		// For more options
		// @link http://www.browsersync.io/docs/options/

		// URL to proxy.
		proxy: config.project_url,

		// Sets the project URL.
		host: config.project_url,

		// `true` Automatically open the browser with BrowserSync live server.
		// `false` Stop the browser from automatically opening.
		// `local` to open
		// `external` to open the external URL - must be online.
		open: config.use_browsersync,

		// Inject CSS changes.
		// Comment it to reload browser for every CSS change.
		injectChanges: config.use_injectcss,

		// Use a specific port (instead of the one auto-detected by Browsersync).
		// port: 7000,

	});
});

/**
 * Task: `styles`.
 *
 * Compiles Sass, Autoprefixes it and Minifies CSS.
 *
 * This task does the following:
 *    1. Gets the source scss file
 *    2. Compiles Sass to CSS
 *    3. Writes Sourcemaps for it
 *    4. Autoprefixes it and generates style.css
 *    5. Injects CSS or reloads the browser via browserSync
 */
gulp.task('styles', function () {
	gulp.src( config.styles_src )
	.pipe( bulkSass() ) // Import directories within .scss files.

	.pipe( rename( config.styles_combined_name + '.css' ) )

	.pipe( sourcemaps.init() )

	.pipe( sass( { // 
		errLogToConsole: true,
		outputStyle: 'compressed',
		precision: 10 // Used to determine how many digits after the decimal will be allowed. 
	} ) )
	.on('error', console.error.bind(console))

	// Using gulp-autoprefixer breaks sourcemapping!
	.pipe( gulpif( config.use_autoprefixer, autoprefixer( { browsers: config.styles_browsers_supported } ) ) ) // Adds vendor prefixes to support browsers listed in config.
	.pipe( sourcemaps.write( './', {
		mapFile: function(mapFilePath){
			// source map files are named *.map instead of *.js.map
			return config.styles_combined_name + '.css.map';
		}
	} ) ) // Set includeContent: true to add the source code to the maps.

	.pipe( gulp.dest( config.styles_dest ) ) // Output sourcemap to file.

	.pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
	.pipe( browserSync.stream() ) // Reloads style.css if that is enqueued.

	.pipe( notify( { message: 'TASK: "styles" Completed! 💯', onLast: true } ) ) // Notifies completion of task 
 });


/**
 * Task: `combinedJS`.
 *
 * Concatenate and minify all JS scripts.
 *
 * This task does the following:
 *     1. Gets the source folder for JS vendor and custom files
 *     2. Concatenates all the files and generates a single .js file
 *     3. Renames the JS file with suffix .min.js
 *     4. Uglifes/Minifies the JS file and generates a .min.js file
 */
gulp.task( 'combinedJS', ['jshint'], function () {

	return streamqueue({ objectMode: true }, // Stream contents of supplied file paths.

		gulp.src( config.scripts_vendor_src ),
		gulp.src( config.scripts_custom_src )		

	)
		.pipe(concat( config.scripts_combined_name + '.js' )) // Combine stream into single file.
		.pipe(minifyjs({ // Minify file.
			ext: {
				min:'.min.js' // Add extension.
			}
		}))
		.pipe(gulp.dest( config.scripts_dest )) // Output files.
		.pipe( notify( { message: 'TASK: "combinedJS" Completed! 💯', onLast: true } ) ) // Notifies completion of task 

});


/**
 * Task: `jshint`.
 *
 * Dependency task run before the JS is compiled and minified to a single file
 */
gulp.task('jshint', function () {

	if( config.use_linting ) { // Check if linting is enabled in config.

		return streamqueue({objectMode: true}, // Stream contents of supplied file paths.

			gulp.src( config.scripts_custom_src ) // Custom-only, ignore linting vendor scripts.

		)
			.pipe( jshint() )
			.pipe( jshint.reporter( 'jshint-stylish' ) ) // Adds a reporter function to style jshint output.
			.pipe( gulpif( config.js_linting_fail_on_error, jshint.reporter( 'fail' ) ) ) // Adds reporter function to fail the build on error.	
	}

});

/**
 * Watch Tasks.
 *
 * Watches for file changes and runs specific tasks.
 */
gulp.task( 'default', ['styles', 'combinedJS', 'browser-sync'], function () {
	
	// Use gulp-watch watcher.
	watch( config.watch_styles, function() { 
		gulp.start('styles'); // Reload on SCSS file changes.
	});

	// Use gulp-watch watcher.
	watch( config.watch_js_custom, function() {
		gulp.start('combinedJS');
	});		

	// Use gulp's watcher
	gulp.watch( config.watch_js_vendor, [ 'combinedJS', reload ] ); // Reload on vendorsJs file changes.
	
});
