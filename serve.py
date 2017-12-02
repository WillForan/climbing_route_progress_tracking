#!/usr/bin/env python3
# (elpy-use-ipython)
from bottle import route, run, post, static_file, request, response
from tinydb import TinyDB, Query
import datetime
import json
from climb_summary import climb_summary

db = TinyDB('./climbing_status.json')


@route('/add',method='POST')
def add():
    data = request.json
    data['timestamp'] = datetime.datetime.now().timestamp()
    print(data)
    db.insert(data)

# just list all statuses from a location
@route('/list/<location>')
def list(location="TCW_boulder"):
    q = Query()
    r = db.search(q.location == location)
    response.content_type = 'application/json'
    return json.dumps(r)

# list summary for a location
@route('/summary')
@route('/summary/<location>')
@route('/summary/<location>/<sortby>')
def list(location="TCW_boulder",sortby="cnt"):
    q = Query()
    r = db.search(q.location == location)
    s = climb_summary(r,sortby)
    response.content_type = 'application/json'
    return json.dumps(s)

# specific route information
@route('/list/<location>/<area>/<color>/<grade>')
@route('/list/<location>/<area>/<color>/<grade>/<sortby>')
def list(area,color,grade,location="TCW_boulder",sortby="cnt"):
    q = Query()
    r = db.search( (q.location == location) & (q.area == area) & 
                   (q.grade == grade) & (q.color == color) )
    s = climb_summary(r,sortby)
    response.content_type = 'application/json'
    return json.dumps(s)


# all filenames are static
@route('/')
@route('/<filename>')
def static_f(filename='index.html'):
    return(static_file(filename, root="./"))


run(host='0.0.0.0',port=8080)
