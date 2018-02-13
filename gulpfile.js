/**
 * Gulpfile.
 *
 * Gulp with WordPress.
 *
 * Implements:
 *      1. Live reloads browser with BrowserSync.
 *      2. CSS: Sass to CSS conversion, error catching, Autoprefixing, Sourcemaps,
 *         CSS minification, and Merge Media Queries.
 *      3. JS: Concatenates & uglifies Vendor and Custom JS files.
 *      4. Images: Minifies PNG, JPEG, GIF and SVG images.
 *      5. Watches files for changes in CSS or JS.
 *      6. Watches files for changes in PHP.
 *      7. Corrects the line endings.
 *      8. InjectCSS instead of browser page reload.
 *      9. Generates .pot file for i18n and l10n.
 *
 * @author Ahmad Awais (@ahmadawais)
 * @version 1.0.3
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
var mmq          = require('gulp-merge-media-queries'); // Combine matching media queries into one media query definition.

// JS related plugins.
var concat       = require('gulp-concat'); // Concatenates JS files
var uglify       = require('gulp-uglify'); // Minifies JS files

// Image realted plugins.
var imagemin     = require('gulp-imagemin'); // Minify PNG, JPEG, GIF and SVG images with imagemin.

// Utility related plugins.
var rename       = require('gulp-rename'); // Renames files E.g. style.css -> style.min.css
var lineec       = require('gulp-line-ending-corrector'); // Consistent Line Endings for non UNIX systems. Gulp Plugin for Line Ending Corrector (A utility that makes sure your files have consistent line endings)
var filter       = require('gulp-filter'); // Enables you to work on a subset of the original files by filtering them using globbing.
var sourcemaps   = require('gulp-sourcemaps'); // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css)
var notify       = require('gulp-notify'); // Sends message notification to you
var browserSync  = require('browser-sync').create(); // Reloads browser and injects CSS. Time-saving synchronised browser testing.
var reload       = browserSync.reload; // For manual browser reload.
var wpPot        = require('gulp-wp-pot'); // For generating the .pot file.
var sort         = require('gulp-sort'); // Recommended to prevent unnecessary changes in pot-file.

var JSONC        = require('json-comments');
var fs           = require('fs');


var configFile = './gulp-config.json';
var configContent;
var config = [];

// Test if config file exists.
try {
	// read in gulp config file.
	configContent = fs.readFileSync( configFile, 'utf8' );
	
	// parse JSON String.
	var config = JSONC.parse( configContent ); 

} catch (exp) {

	// Error if no config file is found.
	throw new Error("Please create the config file 'gulp-config.json'.");
}



/**
 * Project Configuration for gulp tasks.
 *
 * Edit values in gulp-config.json
 *
 */

// Project related.
var projectType             = config.project_type; // Defines the type of project, e.g. theme or plugin

var jsDestination           = config.scripts_dest; // Path to place the compiled JS custom scripts file.
var jsFilename              = config.scripts_combined_name; // Compiled JS custom file name.

// Browsers you care about for autoprefixing.
const AUTOPREFIXER_BROWSERS = config.styles_browsers;


/**
 * Task: `browser-sync`.
 *
 * Live Reloads, CSS injections, Localhost tunneling.
 *
 * This task does the following:
 *    1. Sets the project URL
 *    2. Sets inject CSS
 *    3. You may define a custom port
 *    4. You may want to stop the browser from openning automatically
 */
gulp.task( 'browser-sync', function() {
  browserSync.init( {

	// For more options
	// @link http://www.browsersync.io/docs/options/

	// Project URL.
	proxy: config.project_url,

	// `true` Automatically open the browser with BrowserSync live server.
	// `false` Stop the browser from automatically opening.
	open: config.use_browsersync,

	// Inject CSS changes.
	// Commnet it to reload browser for every CSS change.
	injectChanges: config.use_injectcss,

	// Use a specific port (instead of the one auto-detected by Browsersync).
	// port: 7000,

  } );
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
 *    5. Renames the CSS file with suffix .min.css
 *    6. Minifies the CSS file and generates style.min.css
 *    7. Injects CSS or reloads the browser via browserSync
 */
 gulp.task('styles', function () {
	gulp.src( config.styles_src )
	.pipe( sourcemaps.init() )
	.pipe( sass( {
	  errLogToConsole: true,
	  outputStyle: 'compact',
	  // outputStyle: 'compressed',
	  // outputStyle: 'nested',
	  // outputStyle: 'expanded',
	  precision: 10
	} ) )
	.on('error', console.error.bind(console))
	.pipe( sourcemaps.write( { includeContent: false } ) )
	.pipe( sourcemaps.init( { loadMaps: true } ) )
	.pipe( autoprefixer( AUTOPREFIXER_BROWSERS ) )

	.pipe( sourcemaps.write ( './' ) )
	.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
	.pipe( gulp.dest( config.styles_dest ) )

	.pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
	.pipe( mmq( { log: true } ) ) // Merge Media Queries only for .min.css version.

	.pipe( browserSync.stream() ) // Reloads style.css if that is enqueued.

	.pipe( rename( { suffix: '.min' } ) )
	.pipe( minifycss( {
	  maxLineLen: 10
	}))
	.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
	.pipe( gulp.dest( config.styles_dest ) )

	.pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
	.pipe( browserSync.stream() )// Reloads style.min.css if that is enqueued.
	.pipe( notify( { message: 'TASK: "styles" Completed! 💯', onLast: true } ) )
 });


/**
* Task: `vendorJS`.
*
* Concatenate and uglify vendor JS scripts.
*
* This task does the following:
*     1. Gets the source folder for JS vendor files
*     2. Concatenates all the files and generates vendors.js
*     3. Renames the JS file with suffix .min.js
*     4. Uglifes/Minifies the JS file and generates vendors.min.js
*/
gulp.task( 'vendorsJs', function() {
	gulp.src( config.scripts_vendor_src )
		.pipe( concat( jsVendorFile + '.js' ) )
		.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
		.pipe( gulp.dest( jsVendorDestination ) )
		.pipe( rename( {
			basename: jsVendorFile,
			suffix: '.min'
		}))
		.pipe( uglify() )
		.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
		.pipe( gulp.dest( jsVendorDestination ) )
		.pipe( notify( { message: 'TASK: "vendorsJs" Completed! 💯', onLast: true } ) );
});


 /**
  * Task: `customJS`.
  *
  * Concatenate and uglify custom JS scripts.
  *
  * This task does the following:
  *     1. Gets the source folder for JS custom files
  *     2. Concatenates all the files and generates custom.js
  *     3. Renames the JS file with suffix .min.js
  *     4. Uglifes/Minifies the JS file and generates custom.min.js
  */
gulp.task( 'customJS', function() {
	gulp.src( config.scripts_custom_src )
	.pipe( concat( jsCustomFile + '.js' ) )
	.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
	.pipe( gulp.dest( jsCustomDestination ) )
	.pipe( rename( {
	  basename: jsCustomFile,
	  suffix: '.min'
	}))
	.pipe( uglify() )
	.pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
	.pipe( gulp.dest( jsCustomDestination ) )
	.pipe( notify( { message: 'TASK: "customJs" Completed! 💯', onLast: true } ) );
});


 /**
  * Watch Tasks.
  *
  * Watches for file changes and runs specific tasks.
  */
// gulp.task( 'default', ['styles', 'vendorsJs', 'customJS', 'images', 'browser-sync'], function () {

 gulp.task( 'default', ['styles'], function () {
  gulp.watch( config.watch_styles, [ 'styles' ] ); // Reload on SCSS file changes.
  // gulp.watch( config.watch_js_vendor, [ 'vendorsJs', reload ] ); // Reload on vendorsJs file changes.
  // gulp.watch( config.watch_js_custom, [ 'customJS', reload ] ); // Reload on customJS file changes.
 });
