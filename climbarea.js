var empty_route_info = {
 'area': null,
 'set_date': null,
 'setter': null,
 'name': null,
 //status and rate are dropdowns
 // must be "" instead of null so dropbox selects it
 'grade_full': "", 
 'status': "", 
 'rate': "",
 'color': "", 
 'note': null,
 'location': 'TCW_boulder',
 'climber': null
}
var model = 
 {'current': JSON.parse(JSON.stringify(empty_route_info)),
  'options': {
    'status': ['on-sight','completed','peiced','75%','50%','25%','started','skipped'],
    'color':  ['red','orange','yellow','green','blue','pink','black','white','stripped','rainbow','graphic'],
    'grade':  ['B',0,1,2,3,4,5,6,7,8],
    'ratings': [1,2,3,4,5]
  },
  // left side lists of routes
  'allroutes': [],
  'route_summaries': [],
 }

function sendaway(data) {
     //console.log('sending',data)
     var x = new XMLHttpRequest()
     x.open('POST','/add',true)
     x.setRequestHeader("Content-type","application/json")
     x.send(data)
}
function ajax_update(path,onready){
     var x = new XMLHttpRequest()
     x.onreadystatechange = function() {
       if (this.readyState == 4 && this.status == 200){
           onready(JSON.parse(x.response))
       }
     }
     x.open('GET',path,true)
     //x.setRequestHeader("Content-type","application/json") // overrideMimeType
     x.send()
}
// format a date field in a list of hashes/dicts
// from python datetime
function frmt_date(a,field) {
    for(var i=0; i < a.length; i++){
      if( ! a[i][field] ) { continue }
      var d = new Date(a[i][field] * 1000)
      a[i][field] = d.toISOString().substr(0,16).replace('T',' ')
    }
    return(a)
}

function isempty(x){ return( x === "" || x == null || x == undefined) }
// for filtering. return true when not set, or when matches
function null_or_match(x,m) {
  if( x !== 0 && isempty(x) ) {
   return(true)
  }
  return(x == m) 
}

var vueControler = new Vue({
 el:"#climbing_spa",
 data: model, 
 computed: {
   //current_grade: this.grade_combined
   current_grade: function(){
     grade = this.current.grade_full == 'B' ? -1 : parseInt(this.current.grade_full)
     //console.log('current_grade computed:',this.current.grade_full,grade,isNaN(grade))
     if(isNaN(grade)){ return(null) }
     return (grade + (this.current.plus_half ? .5 : 0) )
   },
   have_any_current: function() {
      return(!isempty(this.current.area)  ||
             !isempty(this.current.color) || 
             !isempty(this.current_grade) )
   },
   have_all_current: function() {
      return(!isempty(this.current.area)  &&
             !isempty(this.current.color) && 
             !isempty(this.current_grade) )
   }

 },
 methods: {
   setClimber: function(climber){
      if(climber === null ){
          climber =  prompt('Who are you?')
      }
      empty_route_info['climber'] = climber
      this.current.climber = empty_route_info['climber']
      // set cookie
      document.cookie = "max-age=31536000"
      document.cookie = "climber="+ climber
   },
   matches_current: function(r){

     //console.log('match current? r:',JSON.stringify(r),' current:',JSON.stringify(this.current))
     return( null_or_match(this.current.color,r.color) &&
             null_or_match(this.current_grade,r.grade) &&
             null_or_match(this.current.area, r.area) )
 
   },
   grade_combined: function(){
     return(this.current_grade)
   },
   setCurrent: function(r){
    console.log('setCurrent',JSON.stringify(r))
    this.current.color = r.color
    this.current.area = r.area
    this.current.name = r.name
    this.current.setter =  r.setter
    area_id = '#area_' + r.area
    // this calls to var and function created later by d3
    svgdiv.select(area_id).each(select_area)
    
    // grade_full is without the .5, and B if -1
    newgrade = parseFloat(r.grade)
    if(isNaN(newgrade)){newgrade = 0}
    //console.log('setCurrent grade from->to:',this.current.grade_full, r.grade, newgrade)
    if( newgrade < 0 ){
      this.current.grade_full == "B"
    }else {   
      this.current.grade_full = Math.floor(newgrade)
    }

    // update half point checkbox
    newplushalf=(newgrade != Math.floor(newgrade))
    //console.log('setCurrent half old,new: ',this.current.plus_half, newplushalf)
    this.current.plus_half = newplushalf
    
    // research all logs of this 
    listURL = ['list', this.current.location, this.current.area,this.current.color, this.current_grade].join('/')
    ajax_update(listURL, this.fetchAllstatuses)
    console.log('updated allroutes', this.allroutes)
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
     console.log('update summary')
     // all routes
     ajax_update('summary/'+this.current.location, this.fetchClimbSummaries)

     // all statuses
     // ajax_update('/list/'+this.current.location, this.fetchAllstatuses)
   },
   /* get data from api server */
   fetchAllstatuses: function(d){
    var self = this
    console.log(d)
    self.allroutes = frmt_date(d,'timestamp')
   },
   fetchClimbSummaries: function(d){
    var self = this
    console.log(d)
    // clean up: unixtimestamp to iso date
    self.route_summaries = frmt_date(d,'recent')
   },

 },
 mounted: function(){
     //console.log('mounting')
     this.updateList()
     // use cookie or prompt for climber(user)
     // should match climber=MY_CLIMBING_ID
     console.log('setting cookie')
     m=decodeURIComponent(document.cookie).match('climber=([^;]+)')
     climber=m?m[1]:null
     this.setClimber(climber)
     console.log('climber = ',this.current.climber,'; should be:', climber)
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
