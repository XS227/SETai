#!/usr/bin/env python3
"""Smart attack positive control (anomalous curves, #E(Fp)=p).
Curve y²=x³+b with j=0 and trace 1: 4p=1+3v². The p-adic lift uses
y²=x³+p·A·x+b, because the plain j=0 lift is the canonical lift, where the
attack fails. Jacobian arithmetic mod p² avoids divisions by p.
Run: python3 smart_attack.py
"""
import math,random,time
import benchmark_reference as b

def anomalous_curve(bits):
    """Smallest p=(1+3v²)/4 ≥ 2^(bits-1), p≡3 mod 4, and b with #E=p."""
    v=math.isqrt((4<<(bits-1))//3)|1
    while True:
        p=(1+3*v*v)//4
        if p%4==3 and b.isprime(p):
            for coef in range(1,500):
                for x in range(1,200):
                    rhs=(x*x*x+coef)%p
                    if rhs and pow(rhs,(p-1)//2,p)==1:
                        G=(x,pow(rhs,(p+1)//4,p))
                        # Hasse: p | #E and p>5 gives #E=p exactly.
                        if b.Group(p,0,p,G).mul(p,G) is None:return p,coef,G
                        break
        v+=2

def lift(P,p,A,coef):
    N=p*p;x,y=P
    f=(x**3+p*A*x+coef-y*y)%N
    assert f%p==0
    return x,(y+(f//p)*pow(2*y,-1,p)%p*p)%N

class Jacobian:
    def __init__(self,N,a):self.N,self.a,self.ops=N,a,0
    def dbl(self,P):
        self.ops+=1;N=self.N;X,Y,Z=P
        S=4*X*Y*Y%N;M=(3*X*X+self.a*pow(Z,4,N))%N
        X3=(M*M-2*S)%N
        return X3,(M*(S-X3)-8*pow(Y,4,N))%N,2*Y*Z%N
    def add(self,P,Q):
        self.ops+=1;N=self.N;X1,Y1,Z1=P;X2,Y2,Z2=Q
        U1=X1*Z2*Z2%N;U2=X2*Z1*Z1%N;S1=Y1*pow(Z2,3,N)%N;S2=Y2*pow(Z1,3,N)%N
        H=(U2-U1)%N;r=(S2-S1)%N;H2=H*H%N;H3=H2*H%N
        X3=(r*r-H3-2*U1*H2)%N
        return X3,(r*(U1*H2-X3)-S1*H3)%N,H*Z1*Z2%N
    def times_p(self,P,p):
        """(p-1)·P by double-and-add, then +P. Only the final sum lands in E1."""
        R=P
        for bit in bin(p-1)[3:]:
            R=self.dbl(R)
            if bit=='1':R=self.add(R,P)
        return self.add(R,P)

def psi(R,p):
    """p-adic elliptic log mod p: -x/y = -X·Z/Y, valuation 1 in E1."""
    X,Y,Z=R;N=p*p
    t=-X*Z*pow(Y,-1,N)%N
    assert t%p==0
    return t//p

def smart(p,coef,G,Q,rng):
    for attempt in range(1,9):
        A=rng.randrange(1,p);J=Jacobian(p*p,p*A)
        pG=J.times_p((*lift(G,p,A,coef),1),p)
        pQ=J.times_p((*lift(Q,p,A,coef),1),p)
        u=psi(pG,p);w=psi(pQ,p)
        if u:return w*pow(u,-1,p)%p,J.ops,attempt
    return None,0,attempt

def smart_positive_control(seed,sizes=(16,32,48)):
    rng=random.Random(seed+977);runs=[]
    for bits in sizes:
        start=time.perf_counter()
        p,coef,G=anomalous_curve(bits)
        C=b.Group(p,0,p,G)
        k=rng.randrange(1,p);Q=C.mul(k)
        recovered,ops,attempts=smart(p,coef,G,Q,rng)
        ok=recovered==k and C.mul(recovered)==Q
        runs.append({'bits':bits,'field_prime':p,'group_order':p,'curve':f'y^2=x^3+{coef}',
          'hidden_k':k,'recovered_k':recovered,'status':'pass' if ok else 'fail',
          'lift_attempts':attempts,'padic_group_operations':ops,
          'elapsed_seconds':round(time.perf_counter()-start,6)})
    return {'status':'pass' if all(r['status']=='pass' for r in runs) else 'fail',
      'control':'anomalous_Smart_padic_log','runs':runs,
      'note':'Hensel lift to Z/p², multiply by p into E1, ratio of p-adic elliptic logs. Linear in log p, not √n.'}

if __name__=='__main__':
    import json;print(json.dumps(smart_positive_control(20261022),indent=2))
