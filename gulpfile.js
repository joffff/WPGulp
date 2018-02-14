/**
 * Gulpfile.
 *
 * Edit values in gulp-config.json
 *
 * Forked from Gulp with WordPress: https://github.com/ahmadawais/WPGulp
 *
 * Implements:
 *      1. Live reloads browser with BrowserSync.
 *      2. CSS: Sass to CSS conversion, error catching, Autoprefixing, Sourcemaps,
 *         CSS minification, and Merge Media Queries.
 *      3. JS: Concatenates & uglifies Vendor and Custom JS files.
 *      5. Watches files for changes in CSS or JS.
 *      7. Corrects the line endings.
 *      8. InjectCSS instead of browser page reload.
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
var mmq          = require('gulp-merge-media-queries'); // Combine matching media queries into one media query definition.

// JS related plugins.
var concat       = require('gulp-concat'); // Concatenates JS files
var jshint       = require('gulp-jshint'); // Adds linting for JS
var minifyjs     = require('gulp-minify'); //https://www.npmjs.com/package/gulp-minify


// Utility related plugins.
var rename       = require('gulp-rename'); // Renames files E.g. style.css -> style.min.css
var lineec       = require('gulp-line-ending-corrector'); // Consistent Line Endings for non UNIX systems. Gulp Plugin for Line Ending Corrector (A utility that makes sure your files have consistent line endings)
var filter       = require('gulp-filter'); // Enables you to work on a subset of the original files by filtering them using globbing.
var bulkSass     = require('gulp-sass-bulk-import'); //https://www.npmjs.com/package/gulp-sass-bulk-import
var sourcemaps   = require('gulp-sourcemaps'); // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css)
var streamqueue  = require('streamqueue'); //https://github.com/contra/gulp-concat
var notify       = require('gulp-notify'); // Sends message notification to you
var browserSync  = require('browser-sync').create(); // Reloads browser and injects CSS. Time-saving synchronised browser testing.
var reload       = browserSync.reload; // For manual browser reload.
var sort         = require('gulp-sort'); // Recommended to prevent unnecessary changes in pot-file.
var watch        = require('gulp-watch');
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
	// Comment it to reload browser for every CSS change.
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
	.pipe(bulkSass())
	.pipe( sourcemaps.init() )
	.pipe( sass( {
	  errLogToConsole: true,
	  outputStyle: config.styles_minify,
	  // outputStyle: 'compressed',
	  // outputStyle: 'nested',
	  // outputStyle: 'expanded',
	  precision: 10
	} ) )
	.on('error', console.error.bind(console))
	.pipe( sourcemaps.write( { includeContent: false } ) )
	.pipe( sourcemaps.init( { loadMaps: true } ) )
	.pipe( autoprefixer( config.styles_browsers ) )

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

	return streamqueue({ objectMode: true },

		gulp.src( config.scripts_vendor_src ),
		gulp.src( config.scripts_custom_src )		
	)
    .pipe(concat( config.scripts_combined_name + '.js' ))
    .pipe(minifyjs({
    	ext: {
    		min:'.min.js'
    	}
    }))
    .pipe(gulp.dest( config.scripts_dest ))
});


/**
* Task: `jshint`.
*
* Dependency task run before the JS is compiled and minified to a single file
*/
gulp.task('jshint', function () {

    if( config.use_linting ) {

        return streamqueue({objectMode: true},
            gulp.src( config.scripts_vendor_src ),
			gulp.src( config.scripts_custom_src )		
        )
	        .pipe(jshint())
	        .pipe(jshint.reporter( 'jshint-stylish' ))
	        .pipe(jshint.reporter( 'fail' ))
    }

});

 /**
  * Watch Tasks.
  *
  * Watches for file changes and runs specific tasks.
  */
// gulp.task( 'default', ['styles', 'vendorsJs', 'customJS', 'images', 'browser-sync'], function () {

gulp.task( 'default', ['styles', 'combinedJS', 'browser-sync'], function () {
	watch( config.watch_styles, function() {
		gulp.start('styles'); // Reload on SCSS file changes.
	});

	gulp.watch( config.watch_js_vendor, [ 'combinedJS', reload ] ); // Reload on vendorsJs file changes.
	
	watch( config.watch_js_custom, function() {
		gulp.start('combinedJS');
	});		
});
