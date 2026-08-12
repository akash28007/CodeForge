/** Maths and number theory. See 01-arrays.mjs for the entry format. */
const ONE_INT = 'A single line containing the integer n.';

export default [
  {
    title: 'Check Prime',
    difficulty: 'EASY',
    statement: 'Given an integer n, print YES if it is prime and NO otherwise. Recall that 1 is not prime.',
    constraints: '1 <= n <= 10^12',
    inputFormat: ONE_INT,
    outputFormat: 'YES or NO.',
    tags: ['math', 'number-theory'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;
 if(n<2){cout<<"NO\\n";return 0;}
 for(long long i=2;i*i<=n;i++)if(n%i==0){cout<<"NO\\n";return 0;}
 cout<<"YES\\n";}`,
    tests: ['7', '1', '1000000007', '999999999999', '2'],
  },
  {
    title: 'Sum of Digits',
    difficulty: 'EASY',
    statement: 'Given a non-negative integer n, print the sum of its decimal digits.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the digit sum.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string n;cin>>n;long long s=0;for(char c:n)s+=c-'0';cout<<s<<"\\n";}`,
    tests: ['12345', '0', '999999999999999999', '10', '7'],
  },
  {
    title: 'Count Digits',
    difficulty: 'EASY',
    statement: 'Given a non-negative integer n, print how many decimal digits it has. The number 0 has one digit.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the number of digits.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string n;cin>>n;cout<<n.size()<<"\\n";}`,
    tests: ['12345', '0', '1000000000000000000', '9', '100'],
  },
  {
    title: 'Power with Modulo',
    difficulty: 'MEDIUM',
    statement:
      'Given integers a, b and m, compute a raised to the power b, modulo m. The exponent can be very large, so repeated multiplication is far too slow — use fast exponentiation by squaring.',
    constraints: '0 <= a <= 10^9\n0 <= b <= 10^18\n1 <= m <= 10^9',
    inputFormat: 'A single line containing three integers a, b and m.',
    outputFormat: 'A single integer — a^b mod m.',
    tags: ['math', 'number-theory'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long a,b,m;cin>>a>>b>>m;
 __int128 r=1;a%=m;
 while(b){if(b&1)r=r*a%m;a=(__int128)a*a%m;b>>=1;}
 cout<<(long long)(r%m)<<"\\n";}`,
    tests: ['2 10 1000', '5 0 7', '0 5 13', '123456789 1000000000000000000 1000000007', '3 3 2'],
  },
  {
    title: 'LCM of Two Numbers',
    difficulty: 'EASY',
    statement: 'Given two positive integers a and b, print their least common multiple.',
    constraints: '1 <= a, b <= 10^9',
    inputFormat: 'A single line containing two integers a and b.',
    outputFormat: 'A single integer — the least common multiple.',
    tags: ['math', 'number-theory'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long a,b;cin>>a>>b;
 cout<<a/__gcd(a,b)*b<<"\\n";}`,
    tests: ['4 6', '1 1', '1000000000 999999999', '7 7', '12 18'],
  },
  {
    title: 'Count Divisors',
    difficulty: 'MEDIUM',
    statement: 'Given a positive integer n, count how many positive integers divide it exactly.',
    constraints: '1 <= n <= 10^12',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the number of divisors.',
    tags: ['math', 'number-theory'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;long long c=0;
 for(long long i=1;i*i<=n;i++)if(n%i==0){c+=(i*i==n)?1:2;}
 cout<<c<<"\\n";}`,
    tests: ['12', '1', '36', '1000000000000', '999999999989'],
  },
  {
    title: 'Sum of First N Natural Numbers',
    difficulty: 'EASY',
    statement:
      'Given a positive integer n, print the sum 1 + 2 + ... + n. Note that n can be large enough that a loop is fine but the result will not fit in 32 bits.',
    constraints: '1 <= n <= 10^9',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the sum.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;cout<<n*(n+1)/2<<"\\n";}`,
    tests: ['10', '1', '1000000000', '100', '3'],
  },
  {
    title: 'Perfect Number',
    difficulty: 'EASY',
    statement:
      'A perfect number equals the sum of its positive divisors excluding itself — 6 = 1 + 2 + 3, for example. Given n, print YES if it is perfect and NO otherwise.',
    constraints: '1 <= n <= 10^12',
    inputFormat: ONE_INT,
    outputFormat: 'YES or NO.',
    tags: ['math', 'number-theory'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;
 if(n==1){cout<<"NO\\n";return 0;}
 long long s=1;
 for(long long i=2;i*i<=n;i++)if(n%i==0){s+=i;if(i!=n/i)s+=n/i;}
 cout<<(s==n?"YES":"NO")<<"\\n";}`,
    tests: ['6', '28', '12', '1', '8128'],
  },
  {
    title: 'Armstrong Number',
    difficulty: 'EASY',
    statement:
      'An Armstrong number of d digits equals the sum of its digits each raised to the power d. For instance 153 has three digits and 1^3 + 5^3 + 3^3 = 153. Print YES or NO.',
    constraints: '1 <= n <= 10^9',
    inputFormat: ONE_INT,
    outputFormat: 'YES or NO.',
    tags: ['math', 'implementation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int d=s.size();
 long long n=stoll(s),sum=0;
 for(char c:s){long long p=1;for(int i=0;i<d;i++)p*=(c-'0');sum+=p;}
 cout<<(sum==n?"YES":"NO")<<"\\n";}`,
    tests: ['153', '154', '9', '9474', '10'],
  },
  {
    title: 'Reverse a Number',
    difficulty: 'EASY',
    statement:
      'Given a non-negative integer n, print the number formed by reversing its decimal digits. Leading zeros in the result are dropped, so 100 becomes 1.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the reversed number.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;reverse(s.begin(),s.end());
 unsigned long long v=stoull(s);cout<<v<<"\\n";}`,
    tests: ['12345', '100', '0', '9', '1000000000000000000'],
  },
  {
    title: 'Prime Factorisation',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer n greater than 1, print its prime factors in increasing order, one per line, each followed by how many times it divides n.',
    constraints: '2 <= n <= 10^12',
    inputFormat: ONE_INT,
    outputFormat: 'One line per distinct prime factor: the prime, a space, then its exponent.',
    tags: ['math', 'number-theory'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;
 for(long long p=2;p*p<=n;p++){if(n%p)continue;int e=0;
  while(n%p==0){n/=p;e++;}cout<<p<<" "<<e<<"\\n";}
 if(n>1)cout<<n<<" 1\\n";}`,
    tests: ['12', '2', '1000000000000', '999999999989', '360'],
  },
  {
    title: 'Sieve of Eratosthenes',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer n, count how many prime numbers are less than or equal to n. For the larger inputs a per-number primality test is too slow — sieve instead.',
    constraints: '1 <= n <= 2000000',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the count of primes up to and including n.',
    tags: ['math', 'number-theory'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;
 if(n<2){cout<<0<<"\\n";return 0;}
 vector<char>c(n+1,1);c[0]=c[1]=0;
 for(long long i=2;i*i<=n;i++)if(c[i])for(long long j=i*i;j<=n;j+=i)c[j]=0;
 cout<<count(c.begin(),c.end(),(char)1)<<"\\n";}`,
    tests: ['10', '1', '2', '100', '2000000'],
  },
  {
    title: 'Binary Representation',
    difficulty: 'EASY',
    statement: 'Given a non-negative integer n, print its binary representation without leading zeros.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'The binary representation of n.',
    tags: ['math', 'bit-manipulation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){unsigned long long n;cin>>n;
 if(n==0){cout<<0<<"\\n";return 0;}
 string s;while(n){s+=char('0'+(n&1));n>>=1;}
 reverse(s.begin(),s.end());cout<<s<<"\\n";}`,
    tests: ['10', '0', '1', '255', '1000000000000000000'],
  },
  {
    title: 'Count Set Bits',
    difficulty: 'EASY',
    statement: 'Given a non-negative integer n, count how many bits are set to 1 in its binary representation.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the number of set bits.',
    tags: ['math', 'bit-manipulation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){unsigned long long n;cin>>n;cout<<__builtin_popcountll(n)<<"\\n";}`,
    tests: ['10', '0', '255', '1', '1152921504606846975'],
  },
  {
    title: 'Power of Two',
    difficulty: 'EASY',
    statement: 'Given a positive integer n, print YES if it is an exact power of two and NO otherwise.',
    constraints: '1 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'YES or NO.',
    tags: ['math', 'bit-manipulation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){unsigned long long n;cin>>n;
 cout<<(((n&(n-1))==0)?"YES":"NO")<<"\\n";}`,
    tests: ['8', '10', '1', '1024', '576460752303423488'],
  },
  {
    title: 'Decimal to Base Conversion',
    difficulty: 'MEDIUM',
    statement:
      'Given a non-negative integer n and a base b between 2 and 16, print n written in base b. Digits above nine are written as the uppercase letters A to F.',
    constraints: '0 <= n <= 10^18\n2 <= b <= 16',
    inputFormat: 'A single line containing two integers n and b.',
    outputFormat: 'n expressed in base b.',
    tags: ['math', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){unsigned long long n;int b;cin>>n>>b;
 if(n==0){cout<<0<<"\\n";return 0;}
 const char*D="0123456789ABCDEF";string s;
 while(n){s+=D[n%b];n/=b;}
 reverse(s.begin(),s.end());cout<<s<<"\\n";}`,
    tests: ['255 16', '10 2', '0 8', '1000000 16', '4095 16'],
  },
  {
    title: 'Nth Prime Number',
    difficulty: 'MEDIUM',
    statement: 'Given a positive integer n, print the nth prime number. The first prime is 2.',
    constraints: '1 <= n <= 100000',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the nth prime.',
    tags: ['math', 'number-theory'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;
 int lim=2000000;vector<char>c(lim+1,1);c[0]=c[1]=0;
 for(long long i=2;i*i<=lim;i++)if(c[i])for(long long j=i*i;j<=lim;j+=i)c[j]=0;
 int cnt=0;
 for(int i=2;i<=lim;i++)if(c[i]&&++cnt==n){cout<<i<<"\\n";return 0;}
 return 0;}`,
    tests: ['1', '10', '100', '1000', '100000'],
  },
  {
    title: 'Happy Number',
    difficulty: 'MEDIUM',
    statement:
      'Repeatedly replace a number by the sum of the squares of its digits. If this eventually reaches 1 the number is happy; otherwise it falls into a cycle. Given n, print YES if it is happy and NO otherwise.',
    constraints: '1 <= n <= 10^9',
    inputFormat: ONE_INT,
    outputFormat: 'YES or NO.',
    tags: ['math', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
long long step(long long n){long long s=0;while(n){long long d=n%10;s+=d*d;n/=10;}return s;}
int main(){long long n;cin>>n;set<long long>seen;
 while(n!=1&&!seen.count(n)){seen.insert(n);n=step(n);}
 cout<<(n==1?"YES":"NO")<<"\\n";}`,
    tests: ['19', '2', '1', '7', '1000000000'],
  },
  {
    title: 'Trailing Zeros in Factorial',
    difficulty: 'MEDIUM',
    statement:
      'Given n, count the trailing zeros of n factorial. Computing the factorial outright is hopeless for large n — count the factors of five instead.',
    constraints: '1 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the number of trailing zeros.',
    tags: ['math', 'number-theory'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;long long c=0;
 for(long long p=5;p<=n;p*=5){c+=n/p;if(p>n/5)break;}
 cout<<c<<"\\n";}`,
    tests: ['5', '10', '3', '100', '1000000000000000000'],
  },
  {
    title: 'Modular Inverse',
    difficulty: 'HARD',
    statement:
      'Given an integer a and a prime p, find the modular inverse of a modulo p — the value x in the range 0 to p-1 with a*x congruent to 1 modulo p. If a is divisible by p no inverse exists, so print -1.\n\nSince p is prime, Fermat’s little theorem gives the inverse directly as a^(p-2) mod p.',
    constraints: '1 <= a <= 10^18\n2 <= p <= 10^9, p is prime',
    inputFormat: 'A single line containing two integers a and p.',
    outputFormat: 'The modular inverse of a modulo p, or -1.',
    tags: ['math', 'number-theory'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
long long pw(long long b,long long e,long long m){__int128 r=1;b%=m;
 while(e){if(e&1)r=r*b%m;b=(__int128)b*b%m;e>>=1;}return (long long)r;}
int main(){long long a,p;cin>>a>>p;
 if(a%p==0){cout<<-1<<"\\n";return 0;}
 cout<<pw(a%p,p-2,p)<<"\\n";}`,
    tests: ['3 7', '1 13', '10 5', '123456789 1000000007', '2 1000000007'],
  },
  {
    title: 'Sum of Squares',
    difficulty: 'EASY',
    statement: 'Given a positive integer n, print 1^2 + 2^2 + ... + n^2.',
    constraints: '1 <= n <= 10^6',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the sum of squares.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;cout<<n*(n+1)*(2*n+1)/6<<"\\n";}`,
    tests: ['3', '1', '10', '1000000', '100'],
  },
  {
    title: 'Collatz Steps',
    difficulty: 'MEDIUM',
    statement:
      'Starting from n, repeatedly halve it when even and replace it by 3n+1 when odd, until it reaches 1. Print how many steps this takes. Starting at 1 takes zero steps.',
    constraints: '1 <= n <= 10^6',
    inputFormat: ONE_INT,
    outputFormat: 'A single integer — the number of steps to reach 1.',
    tags: ['math', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){long long n;cin>>n;long long c=0;
 while(n!=1){n=(n%2==0)?n/2:3*n+1;c++;}
 cout<<c<<"\\n";}`,
    tests: ['6', '1', '27', '1000000', '7'],
  },
  {
    title: 'Binomial Coefficient',
    difficulty: 'HARD',
    statement:
      'Given n and r, compute the number of ways to choose r items from n, modulo 1000000007.\n\nPrecompute factorials and use modular inverses; computing the factorials directly overflows long before n reaches its limit.',
    constraints: '0 <= r <= n <= 1000000',
    inputFormat: 'A single line containing two integers n and r.',
    outputFormat: 'The binomial coefficient modulo 1000000007.',
    tags: ['math', 'number-theory'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
long long pw(long long b,long long e){__int128 r=1;b%=M;
 while(e){if(e&1)r=r*b%M;b=(__int128)b*b%M;e>>=1;}return (long long)r;}
int main(){long long n,r;cin>>n>>r;
 vector<long long>f(n+1);f[0]=1;
 for(long long i=1;i<=n;i++)f[i]=f[i-1]*i%M;
 long long res=f[n]*pw(f[r],M-2)%M*pw(f[n-r],M-2)%M;
 cout<<res<<"\\n";}`,
    tests: ['5 2', '10 0', '1000000 500000', '6 6', '20 10'],
  },
  {
    title: 'Digital Root',
    difficulty: 'EASY',
    statement:
      'Repeatedly replace a number by the sum of its digits until a single digit remains, and print that digit.',
    constraints: '0 <= n <= 10^18',
    inputFormat: ONE_INT,
    outputFormat: 'A single digit — the digital root.',
    tags: ['math', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;long long n=0;for(char c:s)n+=c-'0';
 while(n>9){long long t=0;while(n){t+=n%10;n/=10;}n=t;}
 cout<<n<<"\\n";}`,
    tests: ['12345', '0', '9', '999999999999999999', '10'],
  },
];
