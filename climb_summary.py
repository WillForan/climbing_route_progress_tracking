from itertools import groupby
# helper functions
def groupinfo(itera):
    """
    :param itera: array iterator of climbing route dicts from groupby
    :returns: (dict) with summary stats for that group 
    """
    a = list(itera)

    # rank calc requries a filter
    # mabye worth importing numpy
    ranks = list(filter( lambda x: x is not None, [x.get('rank',None) for x in a]))
    if len(ranks) > 0:
        avgrank = sum(ranks)/len(ranks)
    else:
        avgrank = None

    d = { 'cnt': len(a),
          'recent': max([0] + [x.get('timestamp',0) for x in a]),
          'avgrank': avgrank,
        }
    return(d)

def climb_summary(r,sortby='cnt'):
    header=['location','area','color','grade','setter','name']
    g = groupby(r,lambda x: [x.get(k) for k in header] )
    # summarise all status into count and recent
    s = [{'info': k,
          **groupinfo(a),
          # nfilled is the number of good values we have
          'nfilled': int(k[header.index('setter')] not in [None, ""]) +
                     int(k[header.index('name')] not in [None,""])
          } for k, a in g]

    # break back into array of dict
    d = [ {
          # put back info as dict
          **{k: v for k,v in zip(header,x['info'])},
          # also add any other stats that we computed
          # skip 'info' 
          **{k: x[k] for k in x if k not in ['info']}
        } for x in s]


    # re-group to merge where setter or name is empty
    # maybe we should do this will pandas forwardfill fillna 
    d = fill_idna(d)


    # sort
    s = sorted(d, key=lambda x: x[sortby] )

    return(d)

# this is absolutely misguided
# for a group of climbing dictionaries
# that all have the same loc,area,color, and grade
# match setter and name when we can
# might do terrible things when have only partial info for more than one climb
def try_fill(itera):
    """
    example
    -------
    itera = [
    {'nfilled': 2, 'setter': 'ab', 'name': 'xx', 'avgrank': 3, 'cnt': 10, 'recent': 9}, 
    {'nfilled': 1, 'setter': 'ab', 'name': '', 'avgrank': 1, 'cnt': 2, 'recent': 0},
    {'nfilled': 1, 'setter': '', 'name': 'xx', 'avgrank': 5, 'cnt': 1, 'recent': 10}]
    """
    a_sorted = sorted(itera,key=lambda x: -x.get('nfilled',0))

    matching = ['setter','name']

    # build truth
    truth = []
    while len(a_sorted) >0 and a_sorted[0]['nfilled'] >= 2:
        truth.append( a_sorted.pop(0) )
    # compare the rest to the truth
    # add together if matches
    for ti in range(len(truth)):
      t = truth[ti]
      a_keep = []
      for ai in range(len(a_sorted)):
          a = a_sorted[ai]
          nmatches = sum([ int(t.get(i) == a.get(i) and t.get(i) is not None) for i in matching])
          # if we matched all the good parts of our partially emtpy dict
          # update truth with this count and remove from a
          if nmatches == a['nfilled']:
              truth[ti]['recent'] = max(t['recent'],a['recent'])
              truth[ti]['cnt'] = t['cnt']+a['cnt']

              # deal with null avgrank
              cnt=1
              if t['avgrank']:
                 tavg = t['cnt']*t['avgrank'] 
                 cnt = t['cnt']
              else:
                 tavg = 0
              if a['avgrank']:
                 aavg = a['cnt']*a['avgrank'] 
                 cnt = cnt + t['cnt']
              else:
                 aavg=0

              truth[ti]['avgrank'] = (tavg + aavg)/cnt

          else:
              a_keep.append(ai)
      a_sorted = [a_sorted[i] for i in a_keep]

    return(truth + a_sorted)


def fill_idna(d):
    header = ['location','area','color','grade']
    g = groupby(d, lambda x: [x.get(h) for h in  header])
    m = [ {
           # header as dict
           **{k:v for k,v in zip(header,i)},
           # and merged (and leftovers) for this id
           **x} 
        for i, a in g
        for x in try_fill(a) ]
    return(m)

def to_df_fill(r):
 df = pd.DataFrame(r).\
      assign(nrate= lambda x: x.rank is not None).\
      groupby(['location','area','color','grade']).\
      aggregate(
       {'timestamp': 'max',
        'climber': lambda x: x.size,
        'rate': 'sum',
        'nrate': 'sum'
        })

 return(df.T.to_dict().values() )
