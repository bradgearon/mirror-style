var stylesRoot = 'http://studiostyl.es/',
  scehems = 'schemes/',
  download = 'settings/downloadScheme/',
  cheerio = require( 'cheerio' ),
  fs = require( 'fs' ),
  request = require( 'superagent' ),
  _ = require( 'lodash-node' ),
  en = require( 'lingo' ),
  opts = require( "nomnom" ).parse(),
  less = require('less');
  name = opts[0];

var splitColor = function ( color ) {
  var colorProps = {};
  // AA BB GG RR (VS reverses BB && RR bits...)
  var split = color.match( /0x([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/ );
  if ( split && split.length > 0 ) {
    if ( split.length > 2 ) {
      colorProps.color = split[4] + split[3] + split[2];
    }
    if ( split.length > 1 ) {
      var splitValue = new Number( split[1] );
      if ( splitValue > 0 ) {
        colorProps.opacity = splitValue;
      }
    }
  } else {
    colorProps.color = color;
  }
  return colorProps;
};

var splitHexAColor = function ( color ) {
  var colorProps = {};
  var hex = color.replace( /0x/, '' );
  var a = ( hex & 0xFF000000 ) >> 24;
  var r = ( hex & 0xFF0000 ) >> 16;
  var g = ( hex & 0xFF00 ) >> 8;
  var b = ( hex & 0xFF );
  colorProps.color = r.toString( 16 ) + g.toString( 16 ) + b.toString( 16 );
  colorProps.opacity = new Number( a.toString( 16 ) );
  return colorProps;
};

var readItem = function ( item ) {
  var prop = {};
  if ( item.length > 0 ) {
    var backgroundValues = splitColor( item.attr( 'background' ) );
    var foregroundValues = splitColor( item.attr( 'foreground' ) );
    prop = {
      color: '#' + foregroundValues.color,
      background: '#' + backgroundValues.color,
      opacity: backgroundValues.opacity,
      bold: item.attr( 'boldfont' ) === 'Yes' ? true : false
    };
  }
  return prop;
};

var process = function ( id, themeName ) {
  var url = stylesRoot + download + id;
  console.log( url );
  request.get( url )
    .end( function ( res ) {
      var $ = cheerio.load( res.text );
      console.log( $( 'Items' ) );
      var props = {};

      $( 'Items Item' ).each( function ( i, item ) {

        var $item = $( item ),
          name = $item.attr( 'name' );

        var prop = readItem( $item );
        props[en.camelcase( name )] = prop;
      });

      props.name = en.camelcase( themeName );

      if ( opts.out ) {
        fs.writeFileSync( 'props.json', JSON.stringify( props ) );
      }

      var template = fs.readFileSync( 'variables.mustache', { encoding: 'utf8' });
      var variablesLess = _.template( template, props );
      fs.writeFileSync( 'out/variables.less', variablesLess, { encoding: 'utf8' });
      var templateLess = fs.readFileSync('template.less', {encoding: 'utf8'});

      fs.mkdir('out');
      less.render(templateLess, function(e, css) {
          fs.writeFileSync('out/' + props.name + '.css', css, { encoding: 'utf8' });
      });
  });
};


var getStyle = function ( name ) {
  var url = stylesRoot + scehems + name;

  console.log( url );

  request.get( url )
    .end( function ( res ) {
      var $ = cheerio.load( res.text );
      var onclick = $( '.scheme-details button' ).attr( 'onclick' );
      console.log( onclick );
      if ( onclick ) {
        var match = onclick.match( /downloadExisting\((\d*)\)/ );
        var id = match[match.length - 1];
        console.log( id );
        process( id, name );
      }
    });
};

getStyle( name );