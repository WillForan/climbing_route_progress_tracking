#!/usr/bin/env python3
# (elpy-use-ipython)
from bottle import route, run, post, static_file, request, response, default_app
from tinydb import TinyDB, Query
import datetime
import json
import sys
import os

# need path to this file for other python files
# and static files
scriptdir = os.path.dirname(__file__)
os.chdir(scriptdir)
sys.path.append(scriptdir)
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
def list(location,area,color,grade,sortby="cnt"):
    q = Query()
    r = db.search( (q.location == location) & (q.area == area) &
                   (q.color == color) & (q.grade == float(grade)) )
    response.content_type = 'application/json'
    #print('looking for loc "%s" area "%s" color "%s" grade "%s"' % (location, area, color, grade) )
    #print("found %d" % len(r))
    #s = climb_summary(r,sortby)
    return json.dumps(r)


# all filenames are static
@route('/')
@route('/<filename>')
def static_f(filename='index.html'):
    return(static_file(filename, root="./"))

# 'test' or mod_swgi
if len(sys.argv) > 0 and sys.argv == 'test':
    run(host='0.0.0.0',port=8080)
else:
    # https://bottlepy.org/docs/dev/deployment.html
    # https://stackoverflow.com/questions/18424852/configure-django-on-sub-directory
    application = default_app()

