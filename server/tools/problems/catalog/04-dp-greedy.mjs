/** Recursion, dynamic programming, greedy and searching. See 01-arrays.mjs for the format. */
const INT_ARRAY_IN = 'The first line contains an integer n. The second line contains n space-separated integers.';

export default [
  {
    title: 'Climbing Stairs',
    difficulty: 'EASY',
    statement:
      'A staircase has n steps and you may climb either one or two steps at a time. Count the distinct ways to reach the top, modulo 1000000007.',
    constraints: '1 <= n <= 1000000',
    inputFormat: 'A single line containing the integer n.',
    outputFormat: 'The number of ways, modulo 1000000007.',
    tags: ['dynamic-programming', 'recursion'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
int main(){long long n;cin>>n;
 long long a=1,b=1;
 for(long long i=2;i<=n;i++){long long c=(a+b)%M;a=b;b=c;}
 cout<<b<<"\\n";}`,
    tests: ['4', '1', '2', '10', '1000000'],
  },
  {
    title: 'Coin Change Minimum Coins',
    difficulty: 'MEDIUM',
    statement:
      'Given coin denominations and a target amount, find the fewest coins that add up exactly to the amount. Coins may be reused freely. If the amount cannot be formed, print -1.',
    constraints: '1 <= n <= 100\n1 <= amount <= 10000\n1 <= coin value <= 10000',
    inputFormat:
      'The first line contains two integers n and amount. The second line contains n space-separated coin values.',
    outputFormat: 'The minimum number of coins, or -1.',
    tags: ['dynamic-programming'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n,amt;cin>>n>>amt;vector<int>c(n);for(auto&x:c)cin>>x;
 const int INF=1e9;vector<int>dp(amt+1,INF);dp[0]=0;
 for(int i=1;i<=amt;i++)for(int x:c)if(x<=i&&dp[i-x]+1<dp[i])dp[i]=dp[i-x]+1;
 cout<<(dp[amt]>=INF?-1:dp[amt])<<"\\n";}`,
    tests: ['3 11\n1 2 5', '1 3\n2', '2 6\n3 4', '1 10000\n1', '4 27\n1 5 10 25'],
  },
  {
    title: 'Coin Change Number of Ways',
    difficulty: 'MEDIUM',
    statement:
      'Given coin denominations and a target amount, count the distinct combinations of coins that sum to the amount. Order does not matter, so 1+2 and 2+1 count once. Print the answer modulo 1000000007.',
    constraints: '1 <= n <= 100\n1 <= amount <= 10000\n1 <= coin value <= 10000',
    inputFormat:
      'The first line contains two integers n and amount. The second line contains n space-separated coin values.',
    outputFormat: 'The number of combinations, modulo 1000000007.',
    tags: ['dynamic-programming'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
int main(){int n,amt;cin>>n>>amt;vector<int>c(n);for(auto&x:c)cin>>x;
 vector<long long>dp(amt+1,0);dp[0]=1;
 for(int x:c)for(int i=x;i<=amt;i++)dp[i]=(dp[i]+dp[i-x])%M;
 cout<<dp[amt]<<"\\n";}`,
    tests: ['3 5\n1 2 5', '1 3\n2', '2 10\n2 5', '1 100\n1', '4 27\n1 5 10 25'],
  },
  {
    title: 'House Robber',
    difficulty: 'MEDIUM',
    statement:
      'Each house on a street holds some amount of money, but taking from two adjacent houses triggers an alarm. Find the largest total you can take without ever taking from two neighbours.',
    constraints: '1 <= n <= 100000\n0 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the maximum total.',
    tags: ['dynamic-programming'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;long long take=0,skip=0;
 for(int i=0;i<n;i++){long long x;cin>>x;
  long long nt=skip+x,ns=max(skip,take);
  take=nt;skip=ns;}
 cout<<max(take,skip)<<"\\n";}`,
    tests: ['4\n1 2 3 1', '1\n5', '3\n2 7 9', '5\n0 0 0 0 0', '6\n1000000000 1 1000000000 1 1000000000 1'],
  },
  {
    title: 'Minimum Path Sum in a Grid',
    difficulty: 'MEDIUM',
    statement:
      'You start at the top-left cell of an n by m grid of non-negative numbers and must reach the bottom-right, moving only right or down. Find the smallest possible sum of the cells you pass through, including both endpoints.',
    constraints: '1 <= n, m <= 500\n0 <= cell <= 10^6',
    inputFormat: 'The first line contains n and m. The next n lines each contain m integers.',
    outputFormat: 'A single integer — the minimum path sum.',
    tags: ['dynamic-programming', 'matrix'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;
 vector<vector<long long>>g(n,vector<long long>(m));
 for(auto&r:g)for(auto&x:r)cin>>x;
 for(int i=0;i<n;i++)for(int j=0;j<m;j++){
  if(i==0&&j==0)continue;
  long long best=LLONG_MAX;
  if(i)best=min(best,g[i-1][j]);
  if(j)best=min(best,g[i][j-1]);
  g[i][j]+=best;}
 cout<<g[n-1][m-1]<<"\\n";}`,
    tests: [
      '3 3\n1 3 1\n1 5 1\n4 2 1',
      '1 1\n7',
      '2 2\n1 2\n3 4',
      '1 4\n1 2 3 4',
      '3 2\n1 1\n1 1\n1 1',
    ],
  },
  {
    title: 'Unique Paths in a Grid',
    difficulty: 'MEDIUM',
    statement:
      'Count the distinct routes from the top-left to the bottom-right of an n by m grid when you may only move right or down. Print the answer modulo 1000000007.',
    constraints: '1 <= n, m <= 1000',
    inputFormat: 'A single line containing two integers n and m.',
    outputFormat: 'The number of paths, modulo 1000000007.',
    tags: ['dynamic-programming', 'math'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
int main(){int n,m;cin>>n>>m;
 vector<vector<long long>>dp(n,vector<long long>(m,1));
 for(int i=1;i<n;i++)for(int j=1;j<m;j++)dp[i][j]=(dp[i-1][j]+dp[i][j-1])%M;
 cout<<dp[n-1][m-1]<<"\\n";}`,
    tests: ['3 3', '1 1', '2 2', '1000 1000', '3 7'],
  },
  {
    title: 'Edit Distance',
    difficulty: 'HARD',
    statement:
      'Find the fewest single-character edits — insertions, deletions or substitutions — needed to turn the first string into the second.',
    constraints: '1 <= |a|, |b| <= 2000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'A single integer — the edit distance.',
    tags: ['dynamic-programming', 'strings'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 int n=a.size(),m=b.size();
 vector<int>prev(m+1),cur(m+1);
 for(int j=0;j<=m;j++)prev[j]=j;
 for(int i=1;i<=n;i++){cur[0]=i;
  for(int j=1;j<=m;j++)
   cur[j]=(a[i-1]==b[j-1])?prev[j-1]:1+min({prev[j-1],prev[j],cur[j-1]});
  swap(prev,cur);}
 cout<<prev[m]<<"\\n";}`,
    tests: ['horse\nros', 'abc\nabc', 'a\nb', 'intention\nexecution', 'abcdef\nazced'],
  },
  {
    title: 'Longest Common Subsequence',
    difficulty: 'HARD',
    statement:
      'Find the length of the longest sequence of characters appearing in both strings in the same relative order. The characters need not be adjacent.',
    constraints: '1 <= |a|, |b| <= 2000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'A single integer — the length of the longest common subsequence.',
    tags: ['dynamic-programming', 'strings'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 int n=a.size(),m=b.size();
 vector<int>prev(m+1,0),cur(m+1,0);
 for(int i=1;i<=n;i++){
  for(int j=1;j<=m;j++)
   cur[j]=(a[i-1]==b[j-1])?prev[j-1]+1:max(prev[j],cur[j-1]);
  swap(prev,cur);}
 cout<<prev[m]<<"\\n";}`,
    tests: ['abcde\nace', 'abc\nabc', 'abc\ndef', 'aggtab\ngxtxayb', 'a\na'],
  },
  {
    title: 'Subset Sum Exists',
    difficulty: 'MEDIUM',
    statement:
      'Given n non-negative integers and a target s, decide whether some subset of them adds up to exactly s. The empty subset sums to 0. Print YES or NO.',
    constraints: '1 <= n <= 200\n0 <= s <= 100000\n0 <= a[i] <= 10000',
    inputFormat: 'The first line contains n and s. The second line contains n space-separated integers.',
    outputFormat: 'YES or NO.',
    tags: ['dynamic-programming', 'knapsack'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n,s;cin>>n>>s;vector<int>a(n);for(auto&x:a)cin>>x;
 vector<char>dp(s+1,0);dp[0]=1;
 for(int x:a)for(int i=s;i>=x;i--)if(dp[i-x])dp[i]=1;
 cout<<(dp[s]?"YES":"NO")<<"\\n";}`,
    tests: ['4 9\n3 34 4 12', '3 30\n10 20 5', '1 0\n7', '5 100000\n10000 10000 10000 10000 10000', '2 7\n3 4'],
  },
  {
    title: 'Activity Selection',
    difficulty: 'MEDIUM',
    statement:
      'You are given n activities, each with a start and finish time, and you can only do one at a time. Find the largest number of activities you can complete.\n\nSorting by finish time and greedily taking whatever fits is optimal here.',
    constraints: '1 <= n <= 100000\n0 <= start < finish <= 10^9',
    inputFormat: 'The first line contains n. Each of the next n lines contains two integers: a start and a finish time.',
    outputFormat: 'A single integer — the maximum number of activities.',
    tags: ['greedy', 'sorting'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<pair<long long,long long>>v(n);
 for(auto&[s,f]:v)cin>>s>>f;
 sort(v.begin(),v.end(),[](auto&a,auto&b){return a.second<b.second;});
 long long last=LLONG_MIN;int c=0;
 for(auto&[s,f]:v)if(s>=last){c++;last=f;}
 cout<<c<<"\\n";}`,
    tests: [
      '4\n1 3\n2 5\n4 7\n6 8',
      '1\n0 1',
      '3\n1 2\n1 2\n1 2',
      '5\n0 10\n1 2\n2 3\n3 4\n4 5',
      '3\n1 100\n2 3\n50 60',
    ],
  },
  {
    title: 'Fractional Knapsack',
    difficulty: 'MEDIUM',
    statement:
      'You have a bag of capacity W and n items, each with a weight and a value. Unlike the classic knapsack you may take fractions of an item. Print the greatest total value achievable, rounded to exactly two decimal places.',
    constraints: '1 <= n <= 100000\n1 <= W <= 10^9\n1 <= weight, value <= 10^6',
    inputFormat: 'The first line contains n and W. Each of the next n lines contains an item weight and value.',
    outputFormat: 'The maximum value, with exactly two digits after the decimal point.',
    tags: ['greedy', 'sorting'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,W;cin>>n>>W;
 vector<pair<long long,long long>>v(n);
 for(auto&[w,val]:v)cin>>w>>val;
 sort(v.begin(),v.end(),[](auto&a,auto&b){
  return (long double)a.second/a.first>(long double)b.second/b.first;});
 long double tot=0;long long cap=W;
 for(auto&[w,val]:v){
  if(cap<=0)break;
  if(w<=cap){tot+=val;cap-=w;}
  else{tot+=(long double)val*cap/w;cap=0;}}
 cout<<fixed<<setprecision(2)<<(double)tot<<"\\n";}`,
    tests: [
      '3 50\n10 60\n20 100\n30 120',
      '1 1\n1 1',
      '2 5\n10 100\n10 100',
      '3 100\n10 10\n20 20\n30 30',
      '2 15\n10 60\n10 60',
    ],
  },
  {
    title: 'Minimum Platforms',
    difficulty: 'HARD',
    statement:
      'Given the arrival and departure times of n trains at a station, find the smallest number of platforms needed so that no train ever waits. A train arriving exactly when another departs still needs its own platform.',
    constraints: '1 <= n <= 100000\n0 <= arrival <= departure <= 10^9',
    inputFormat:
      'The first line contains n. The second line contains n arrival times. The third line contains n departure times.',
    outputFormat: 'A single integer — the minimum number of platforms.',
    tags: ['greedy', 'sorting', 'two-pointers'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n),d(n);
 for(auto&x:a)cin>>x;for(auto&x:d)cin>>x;
 sort(a.begin(),a.end());sort(d.begin(),d.end());
 int i=0,j=0,cur=0,best=0;
 while(i<n){if(a[i]<=d[j]){cur++;i++;best=max(best,cur);}
  else{cur--;j++;}}
 cout<<best<<"\\n";}`,
    tests: [
      '6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000',
      '1\n0\n1',
      '3\n1 2 3\n10 11 12',
      '3\n1 5 10\n2 6 11',
      '4\n0 0 0 0\n1 1 1 1',
    ],
  },
  {
    title: 'Job Sequencing with Deadlines',
    difficulty: 'HARD',
    statement:
      'Each of n jobs takes one unit of time, has a deadline and pays a profit if finished by that deadline. Only one job runs at a time and time starts at 1. Choose jobs to maximise total profit.',
    constraints: '1 <= n <= 100000\n1 <= deadline <= 100000\n1 <= profit <= 10^6',
    inputFormat: 'The first line contains n. Each of the next n lines contains a deadline and a profit.',
    outputFormat: 'A single integer — the maximum total profit.',
    tags: ['greedy', 'sorting'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<pair<long long,long long>>v(n);
 for(auto&[d,p]:v)cin>>d>>p;
 sort(v.begin(),v.end(),[](auto&a,auto&b){return a.first<b.first;});
 priority_queue<long long,vector<long long>,greater<long long>>pq;
 for(auto&[d,p]:v){pq.push(p);
  if((long long)pq.size()>d)pq.pop();}
 long long tot=0;while(!pq.empty()){tot+=pq.top();pq.pop();}
 cout<<tot<<"\\n";}`,
    tests: [
      '4\n4 20\n1 10\n1 40\n1 30',
      '1\n1 5',
      '3\n1 10\n1 20\n1 30',
      '5\n2 100\n1 19\n2 27\n1 25\n3 15',
      '3\n3 1\n3 1\n3 1',
    ],
  },
  {
    title: 'Search in Rotated Sorted Array',
    difficulty: 'HARD',
    statement:
      'A sorted array of distinct integers has been rotated at some unknown pivot, so [1,2,3,4,5] might have become [3,4,5,1,2]. Given the rotated array and a target, print the 1-based index of the target, or -1 if it is absent. Your solution should not simply scan every element.',
    constraints: '1 <= n <= 100000\nAll values are distinct.\n-10^9 <= a[i], target <= 10^9',
    inputFormat: 'The first line contains n and the target. The second line contains the n rotated values.',
    outputFormat: 'The 1-based index of the target, or -1.',
    tags: ['binary-search', 'arrays'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,t;cin>>n>>t;vector<long long>a(n);for(auto&x:a)cin>>x;
 long long lo=0,hi=n-1;
 while(lo<=hi){long long mid=(lo+hi)/2;
  if(a[mid]==t){cout<<mid+1<<"\\n";return 0;}
  if(a[lo]<=a[mid]){ if(t>=a[lo]&&t<a[mid])hi=mid-1; else lo=mid+1; }
  else { if(t>a[mid]&&t<=a[hi])lo=mid+1; else hi=mid-1; }}
 cout<<-1<<"\\n";}`,
    tests: ['5 1\n3 4 5 1 2', '5 6\n3 4 5 1 2', '1 1\n1', '7 4\n4 5 6 7 0 1 2', '3 3\n1 2 3'],
  },
  {
    title: 'First and Last Position',
    difficulty: 'MEDIUM',
    statement:
      'Given a sorted array and a target, print the 1-based indices of the first and last occurrence of the target, separated by a space. If it does not occur, print "-1 -1".',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i], target <= 10^9\nThe array is sorted in non-decreasing order.',
    inputFormat: 'The first line contains n and the target. The second line contains the n sorted values.',
    outputFormat: 'Two space-separated integers, or -1 -1.',
    tags: ['binary-search', 'arrays'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,t;cin>>n>>t;vector<long long>a(n);for(auto&x:a)cin>>x;
 auto lo=lower_bound(a.begin(),a.end(),t);
 auto hi=upper_bound(a.begin(),a.end(),t);
 if(lo==a.end()||*lo!=t){cout<<"-1 -1\\n";return 0;}
 cout<<(lo-a.begin()+1)<<" "<<(hi-a.begin())<<"\\n";}`,
    tests: ['6 2\n1 2 2 2 3 4', '4 5\n1 2 3 4', '1 1\n1', '5 3\n3 3 3 3 3', '7 4\n1 2 3 4 5 6 7'],
  },
  {
    title: 'Square Root by Binary Search',
    difficulty: 'MEDIUM',
    statement:
      'Given a non-negative integer n, print the largest integer whose square does not exceed n — that is, the integer part of its square root.',
    constraints: '0 <= n <= 10^18',
    inputFormat: 'A single line containing the integer n.',
    outputFormat: 'A single integer — the floor of the square root of n.',
    tags: ['binary-search', 'math'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){unsigned long long n;cin>>n;
 unsigned long long lo=0,hi=2000000000ULL,ans=0;
 while(lo<=hi){unsigned long long m=lo+(hi-lo)/2;
  if(m<=n/(m?m:1)&&m*m<=n){ans=m;lo=m+1;}else hi=m-1;}
 cout<<ans<<"\\n";}`,
    tests: ['16', '0', '2', '1000000000000000000', '999999999999999999'],
  },
  {
    title: 'Aggressive Cows',
    difficulty: 'HARD',
    statement:
      'You are given the positions of n stalls along a line and must place k cows in distinct stalls so that the smallest distance between any two cows is as large as possible. Print that largest possible minimum distance.\n\nBinary search on the answer: for a candidate distance, greedily place cows and check whether all k fit.',
    constraints: '2 <= k <= n <= 100000\n0 <= position <= 10^9',
    inputFormat: 'The first line contains n and k. The second line contains the n stall positions.',
    outputFormat: 'A single integer — the largest possible minimum distance.',
    tags: ['binary-search', 'greedy'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;
 sort(a.begin(),a.end());
 auto ok=[&](long long d){long long c=1,last=a[0];
  for(long long i=1;i<n;i++)if(a[i]-last>=d){c++;last=a[i];}
  return c>=k;};
 long long lo=0,hi=a[n-1]-a[0],ans=0;
 while(lo<=hi){long long m=lo+(hi-lo)/2;
  if(ok(m)){ans=m;lo=m+1;}else hi=m-1;}
 cout<<ans<<"\\n";}`,
    tests: ['5 3\n1 2 8 4 9', '2 2\n0 1000000000', '5 5\n1 2 3 4 5', '4 2\n10 10 10 10', '6 3\n1 3 5 7 9 11'],
  },
  {
    title: 'Tower of Hanoi Moves',
    difficulty: 'EASY',
    statement:
      'Count the minimum number of moves needed to shift n discs from one peg to another in the Tower of Hanoi, printing the answer modulo 1000000007.',
    constraints: '1 <= n <= 10^18',
    inputFormat: 'A single line containing the integer n.',
    outputFormat: 'The minimum number of moves, modulo 1000000007.',
    tags: ['recursion', 'math'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
long long pw(long long b,long long e){__int128 r=1;b%=M;
 while(e){if(e&1)r=r*b%M;b=(__int128)b*b%M;e>>=1;}return (long long)r;}
int main(){long long n;cin>>n;cout<<((pw(2,n)-1)%M+M)%M<<"\\n";}`,
    tests: ['3', '1', '10', '1000000000000000000', '64'],
  },
  {
    title: 'Generate Balanced Parentheses',
    difficulty: 'HARD',
    statement:
      'Given n, print every balanced string of n pairs of round brackets, in lexicographic order with "(" considered smaller than ")". Print one string per line.',
    constraints: '1 <= n <= 10',
    inputFormat: 'A single line containing the integer n.',
    outputFormat: 'All balanced bracket strings of n pairs, one per line, in lexicographic order.',
    tags: ['recursion', 'strings'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int n;string cur;vector<string>out;
void go(int open,int close){
 if((int)cur.size()==2*n){out.push_back(cur);return;}
 if(open<n){cur+='(';go(open+1,close);cur.pop_back();}
 if(close<open){cur+=')';go(open,close+1);cur.pop_back();}}
int main(){cin>>n;go(0,0);
 for(auto&s:out)cout<<s<<"\\n";}`,
    tests: ['3', '1', '2', '4', '5'],
  },
  {
    title: 'Count Subsets with Given Sum',
    difficulty: 'HARD',
    statement:
      'Given n non-negative integers and a target s, count the subsets whose elements add up to exactly s. Two subsets are different if they use different positions, even when the values match. Print the count modulo 1000000007.',
    constraints: '1 <= n <= 200\n0 <= s <= 10000\n0 <= a[i] <= 1000',
    inputFormat: 'The first line contains n and s. The second line contains n space-separated integers.',
    outputFormat: 'The number of subsets, modulo 1000000007.',
    tags: ['dynamic-programming', 'knapsack'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
int main(){int n,s;cin>>n>>s;vector<int>a(n);for(auto&x:a)cin>>x;
 vector<long long>dp(s+1,0);dp[0]=1;
 for(int x:a)for(int i=s;i>=x;i--)dp[i]=(dp[i]+dp[i-x])%M;
 cout<<dp[s]<<"\\n";}`,
    tests: ['4 3\n1 1 1 1', '3 0\n0 0 0', '1 5\n5', '5 10\n1 2 3 4 5', '3 7\n2 3 5'],
  },
  {
    title: 'Maximum Product Subarray',
    difficulty: 'HARD',
    statement:
      'Given an array of integers, find the largest product obtainable from any contiguous non-empty subarray.\n\nNegatives make this trickier than the sum version: a very negative running product can become the best one after another negative, so track both the running maximum and the running minimum.',
    constraints: '1 <= n <= 100000\n-10 <= a[i] <= 10',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the maximum product.',
    tags: ['arrays', 'dynamic-programming'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;
 long long best=LLONG_MIN,mx=1,mn=1;bool first=true;
 for(int i=0;i<n;i++){long long x;cin>>x;
  if(first){mx=mn=x;first=false;}
  else{long long a=mx*x,b=mn*x;
   mx=max({x,a,b});mn=min({x,a,b});}
  best=max(best,mx);}
 cout<<best<<"\\n";}`,
    tests: ['4\n2 3 -2 4', '3\n-2 0 -1', '1\n-5', '5\n-1 -2 -3 -4 -5', '6\n2 -5 -2 -4 3 1'],
  },
  {
    title: 'Longest Palindromic Substring Length',
    difficulty: 'HARD',
    statement:
      'Given a string of lowercase letters, find the length of the longest contiguous block that reads the same forwards and backwards.',
    constraints: '1 <= |s| <= 5000\ns consists of lowercase English letters.',
    inputFormat: 'A single line containing the string s.',
    outputFormat: 'A single integer — the length of the longest palindromic substring.',
    tags: ['strings', 'dynamic-programming'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int n=s.size(),best=1;
 for(int c=0;c<n;c++){
  int l=c,r=c;while(l>=0&&r<n&&s[l]==s[r]){best=max(best,r-l+1);l--;r++;}
  l=c;r=c+1;while(l>=0&&r<n&&s[l]==s[r]){best=max(best,r-l+1);l--;r++;}}
 cout<<best<<"\\n";}`,
    tests: ['babad', 'cbbd', 'a', 'abcdefg', 'aaaaaaaa'],
  },
  {
    title: 'Partition Equal Subset Sum',
    difficulty: 'HARD',
    statement:
      'Given n positive integers, decide whether they can be split into two groups with equal totals. Print YES or NO.',
    constraints: '1 <= n <= 200\n1 <= a[i] <= 1000',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'YES or NO.',
    tags: ['dynamic-programming', 'knapsack'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<int>a(n);int tot=0;
 for(auto&x:a){cin>>x;tot+=x;}
 if(tot%2){cout<<"NO\\n";return 0;}
 int h=tot/2;vector<char>dp(h+1,0);dp[0]=1;
 for(int x:a)for(int i=h;i>=x;i--)if(dp[i-x])dp[i]=1;
 cout<<(dp[h]?"YES":"NO")<<"\\n";}`,
    tests: ['4\n1 5 11 5', '3\n1 2 5', '2\n1 1', '1\n2', '6\n3 3 3 3 3 3'],
  },
  {
    title: 'Number of Islands',
    difficulty: 'HARD',
    statement:
      'A grid of 0s and 1s represents water and land. An island is a group of 1s connected horizontally or vertically — diagonals do not connect. Count the islands.',
    constraints: '1 <= n, m <= 500\nEach cell is 0 or 1.',
    inputFormat: 'The first line contains n and m. The next n lines each contain m characters with no spaces.',
    outputFormat: 'A single integer — the number of islands.',
    tags: ['graphs', 'matrix', 'recursion'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n,m;cin>>n>>m;vector<string>g(n);
 for(auto&r:g)cin>>r;
 int cnt=0;
 vector<pair<int,int>>st;
 for(int i=0;i<n;i++)for(int j=0;j<m;j++){
  if(g[i][j]!='1')continue;
  cnt++;st.push_back({i,j});g[i][j]='0';
  while(!st.empty()){auto[x,y]=st.back();st.pop_back();
   int dx[]={1,-1,0,0},dy[]={0,0,1,-1};
   for(int d=0;d<4;d++){int nx=x+dx[d],ny=y+dy[d];
    if(nx<0||ny<0||nx>=n||ny>=m||g[nx][ny]!='1')continue;
    g[nx][ny]='0';st.push_back({nx,ny});}}}
 cout<<cnt<<"\\n";}`,
    tests: [
      '4 5\n11000\n11000\n00100\n00011',
      '1 1\n0',
      '1 1\n1',
      '3 3\n111\n111\n111',
      '3 3\n101\n010\n101',
    ],
  },
];
