var empty_route_info = {
 'color': null, 'grade': null, 
 'area': null,
 'set_date': null,
 'setter': null,
 'name': null,
 //status and rate are dropdowns
 // must be "" instead of null so dropbox selects it
 'status': "", 
 'rate': "",
 'note': null,
 'location': 'TCW_boulder',
 'climber': 'WF'
}
var model = 
 {'current': JSON.parse(JSON.stringify(empty_route_info)),
  'options': {
    'status': ['on-sight','completed','peiced','75%','50%','25%','started','skipped'],
    'color':  ['blue','orange','red','pink','black','yellow','white','strip','rainbow'],
    'grade':  ['B',0,1,2,3,4,5,6,7,8],
    'ratings': [1,2,3,4,5]
  },
  'allroutes': []
 }

sendaway = function(data) {
     //console.log('sending',data)
     var x = new XMLHttpRequest()
     x.open('POST','/add',true)
     x.setRequestHeader("Content-type","application/json")
     x.send(data)
}
getRouteList = function(location,onready){
     var x = new XMLHttpRequest()
     x.onreadystatechange = function() {
       if (this.readyState == 4 && this.status == 200){
           onready(JSON.parse(x.response))
       }
     }
     x.open('GET','/list/'+location,true)
     //x.setRequestHeader("Content-type","application/json") // overrideMimeType
     x.send()
}

var vueControler = new Vue({
 el:"#climbing_spa",
 data: model, 
 methods: {
   grade_combined: function(){
     return (this.current.grade_full == 'B' ? -1 : this.current.grade_full) + (this.current.plus_half ? .5 : 0) 
   },
   setCurrent: function(color,grade,area){
    console.log(color,grade,area)
    this.current.color = color
    this.current.area = area
    area_id = '#area_' + area
    // this calls to var and function created later by d3
    svgdiv.select(area_id).each(select_area)
    
    // grade_full is without the .5, and B if -1
    if(grade == "-1"){
      this.current.grade_full == "B"
    }else {   
      this.current.grade_full = Math.floor(grade)
    }
    this.current.plus_half = grade != Math.floor(grade)
   },
   addCurrent: function(){
     this.current.grade = this.grade_combined()
     data = JSON.stringify(this.current)
     sendaway(data)
     // update view to empyt state
     // TODO: maybe keep
     this.updateList()
     this.reset_current()
   },
   // cannot use until page is loaded because reset color defied later
   // means we code copy of empty_route_info twice
   reset_current: function(){
     this.current = JSON.parse(JSON.stringify(empty_route_info))
     reset_color()
   },
   updateList: function() {
     getRouteList(this.current.location, this.updateListWithData)
   },
   updateListWithData: function(d){
    var self = this
    console.log(d)
    self.allroutes = d 
    // clean up: unixtimestamp to iso date
    for(var i=0;i<this.allroutes.length; i++){
      if( ! self.allroutes[i]['timestamp'] ) { continue }
      var d = new Date(self.allroutes[i]['timestamp'] * 1000)
      self.allroutes[i]['timestamp'] = d.toISOString()
    }
   }
  },
 mounted: function(){
     this.updateList()
 }
})

// setup
//var svgdiv = d3.select("body").append("div");
//svgdiv.attr("id","climbingAreas")
var svgdiv = d3.select("div#climbingAreas");


var svg;
var clickable;

function reset_color() {
  clickable.each( function() {
      d3.select(this).style('fill','green')  
  })
}

function select_area() {
 reset_color()
 area = d3.select(this)
 area.style('fill','red')
 name = area.attr('id').match(/area_(.*)/)[1]
 model.current.area = name
 console.log(name)
}

// inject svg, define clickable
d3.xml("outline.svg", function(error, documentFragment) {
        if (error) {console.log(error); return;}
        
        svgdiv.node().appendChild(
             documentFragment.getElementsByTagName("svg")[0]
        );

        svg = svgdiv.select("svg")

        // shrink 
        svg.attr("width", "400")
        svg.attr("height", "250")

        allpaths = svg.selectAll('path,rect')

        clickable = allpaths.filter(function() {
             id=d3.select(this).attr('id')
             return( id !== null && id.match(/area/) !== null ) 
        })
           
        clickable.each( function() {
              p=d3.select(this)
              p.style('cursor','pointer')
              p.on('click',select_area)
        })
    });
