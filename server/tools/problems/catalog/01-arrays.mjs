/**
 * Arrays and basic array processing.
 *
 * Statements are written for CodeForge — these are classic exercises, but the wording,
 * constraints and test data are original. Nothing is copied from another judge.
 *
 * `tests[0]` becomes the worked example on the problem page, so it should be small
 * enough to follow by eye. `visible` controls how many of the leading tests reveal
 * expected/actual output on failure.
 */
const INT_ARRAY_IN = 'The first line contains an integer n. The second line contains n space-separated integers.';

export default [
  {
    title: 'Array Sum',
    difficulty: 'EASY',
    statement: 'You are given an array of n integers. Print the sum of all its elements.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the sum of the array.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long s=0;for(int i=0;i<n;i++){long long x;cin>>x;s+=x;}
 cout<<s<<"\\n";}`,
    tests: ['5\n1 2 3 4 5', '1\n-7', '4\n1000000000 1000000000 1000000000 1000000000', '6\n-5 5 -5 5 -5 5', '3\n0 0 0'],
  },
  {
    title: 'Second Largest Element',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers, find the second largest distinct value in it. If every element is the same, so that no second distinct value exists, print -1.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The second largest distinct value, or -1 if there is none.',
    tags: ['arrays'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 sort(a.begin(),a.end());a.erase(unique(a.begin(),a.end()),a.end());
 if(a.size()<2){cout<<-1<<"\\n";return 0;}
 cout<<a[a.size()-2]<<"\\n";}`,
    tests: ['5\n3 1 4 4 5', '3\n7 7 7', '2\n-1 -2', '6\n10 9 8 7 6 5', '1\n42'],
  },
  {
    title: 'Count Even and Odd',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers, count how many of them are even and how many are odd. Note that negative numbers can be even too.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'Two space-separated integers: the count of even numbers followed by the count of odd numbers.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long e=0,o=0;for(int i=0;i<n;i++){long long x;cin>>x;if(x%2==0)e++;else o++;}
 cout<<e<<" "<<o<<"\\n";}`,
    tests: ['6\n1 2 3 4 5 6', '4\n-2 -3 -4 -5', '1\n0', '5\n7 7 7 7 7', '3\n1000000000 999999999 2'],
  },
  {
    title: 'Reverse an Array',
    difficulty: 'EASY',
    statement: 'Given an array of n integers, print its elements in reverse order.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'n space-separated integers — the array in reverse order.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 for(int i=n-1;i>=0;i--)cout<<a[i]<<" \\n"[i==0];}`,
    tests: ['5\n1 2 3 4 5', '1\n9', '4\n-1 -2 -3 -4', '3\n0 5 0', '6\n10 20 30 40 50 60'],
  },
  {
    title: 'Linear Search',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers and a target value x, print the 1-based index of the first occurrence of x in the array. If x does not appear, print -1.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i], x <= 10^9',
    inputFormat:
      'The first line contains two integers n and x. The second line contains n space-separated integers.',
    outputFormat: 'The 1-based index of the first occurrence of x, or -1.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,x;cin>>n>>x;
 for(long long i=1;i<=n;i++){long long v;cin>>v;if(v==x){cout<<i<<"\\n";return 0;}}
 cout<<-1<<"\\n";}`,
    tests: ['5 3\n1 2 3 4 5', '4 9\n1 2 3 4', '3 7\n7 7 7', '1 -5\n-5', '6 100\n1 100 2 100 3 100'],
  },
  {
    title: 'Sum of Even Numbers',
    difficulty: 'EASY',
    statement: 'Given an array of n integers, print the sum of only the even-valued elements. If there are none, print 0.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the sum of the even elements.',
    tags: ['arrays', 'math'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long s=0;for(int i=0;i<n;i++){long long x;cin>>x;if(x%2==0)s+=x;}
 cout<<s<<"\\n";}`,
    tests: ['5\n1 2 3 4 5', '3\n1 3 5', '4\n-2 -4 6 8', '1\n0', '5\n1000000000 2 4 6 8'],
  },
  {
    title: 'Minimum and Maximum',
    difficulty: 'EASY',
    statement: 'Given an array of n integers, print its smallest and largest elements.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'Two space-separated integers: the minimum followed by the maximum.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long mn=LLONG_MAX,mx=LLONG_MIN;
 for(int i=0;i<n;i++){long long x;cin>>x;mn=min(mn,x);mx=max(mx,x);}
 cout<<mn<<" "<<mx<<"\\n";}`,
    tests: ['5\n3 1 4 1 5', '1\n7', '4\n-10 -20 -30 -40', '3\n0 0 0', '6\n1000000000 -1000000000 5 6 7 8'],
  },
  {
    title: 'Count Occurrences',
    difficulty: 'EASY',
    statement: 'Given an array of n integers and a value x, count how many times x appears in the array.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i], x <= 10^9',
    inputFormat: 'The first line contains two integers n and x. The second line contains n space-separated integers.',
    outputFormat: 'A single integer — the number of occurrences of x.',
    tags: ['arrays', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,x;cin>>n>>x;long long c=0;
 for(long long i=0;i<n;i++){long long v;cin>>v;if(v==x)c++;}
 cout<<c<<"\\n";}`,
    tests: ['5 2\n1 2 2 3 2', '4 9\n1 2 3 4', '3 0\n0 0 0', '1 5\n5', '6 -1\n-1 1 -1 1 -1 1'],
  },
  {
    title: 'Array Average',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers, print their average rounded to exactly two decimal places. Standard rounding applies.',
    constraints: '1 <= n <= 100000\n-10^6 <= a[i] <= 10^6',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The average, printed with exactly two digits after the decimal point.',
    tags: ['arrays', 'math'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long double s=0;for(int i=0;i<n;i++){long long x;cin>>x;s+=x;}
 cout<<fixed<<setprecision(2)<<(double)(s/n)<<"\\n";}`,
    tests: ['4\n1 2 3 4', '3\n1 2 2', '1\n7', '5\n-1 -2 -3 -4 -5', '2\n1000000 -1000000'],
  },
  {
    title: 'Move Zeros to End',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers, move every zero to the end of the array while keeping the relative order of the non-zero elements unchanged. Print the resulting array.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'n space-separated integers — the rearranged array.',
    tags: ['arrays', 'two-pointers'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n),r;int z=0;
 for(auto&x:a)cin>>x;
 for(auto x:a){if(x==0)z++;else r.push_back(x);}
 while(z--)r.push_back(0);
 for(int i=0;i<n;i++)cout<<r[i]<<" \\n"[i==n-1];}`,
    tests: ['6\n0 1 0 3 12 0', '3\n0 0 0', '4\n1 2 3 4', '1\n0', '5\n-1 0 -2 0 3'],
  },
  {
    title: 'Prefix Sum Queries',
    difficulty: 'MEDIUM',
    statement:
      'You are given an array of n integers and q queries. Each query gives two indices l and r (1-based, inclusive) and asks for the sum of the elements in that range. Answer every query.\n\nA naive scan per query is too slow for the largest inputs — precompute prefix sums so each query is answered in constant time.',
    constraints: '1 <= n, q <= 100000\n1 <= l <= r <= n\n-10^9 <= a[i] <= 10^9',
    inputFormat:
      'The first line contains two integers n and q. The second line contains n space-separated integers. Each of the next q lines contains two integers l and r.',
    outputFormat: 'q lines, each the answer to the corresponding query.',
    tags: ['arrays', 'prefix-sum'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n,q;cin>>n>>q;vector<long long>p(n+1,0);
 for(int i=1;i<=n;i++){long long x;cin>>x;p[i]=p[i-1]+x;}
 while(q--){int l,r;cin>>l>>r;cout<<p[r]-p[l-1]<<"\\n";}}`,
    tests: [
      '5 3\n1 2 3 4 5\n1 5\n2 3\n4 4',
      '1 2\n-5\n1 1\n1 1',
      '6 4\n1 -1 1 -1 1 -1\n1 6\n1 2\n3 5\n6 6',
      '4 2\n1000000000 1000000000 1000000000 1000000000\n1 4\n2 3',
      '3 3\n0 0 0\n1 1\n1 2\n1 3',
    ],
  },
  {
    title: 'Rotate Array Left',
    difficulty: 'EASY',
    statement:
      'Given an array of n integers, rotate it k positions to the left and print the result. Rotating left by one moves the first element to the end. Note that k may be larger than n.',
    constraints: '1 <= n <= 100000\n0 <= k <= 10^9\n-10^9 <= a[i] <= 10^9',
    inputFormat: 'The first line contains two integers n and k. The second line contains n space-separated integers.',
    outputFormat: 'n space-separated integers — the rotated array.',
    tags: ['arrays', 'implementation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;
 k%=n;
 for(long long i=0;i<n;i++)cout<<a[(i+k)%n]<<" \\n"[i==n-1];}`,
    tests: ['5 2\n1 2 3 4 5', '4 0\n1 2 3 4', '3 7\n1 2 3', '1 1000000000\n9', '6 3\n-1 -2 -3 -4 -5 -6'],
  },
  {
    title: 'Remove Duplicates from Sorted Array',
    difficulty: 'EASY',
    statement:
      'You are given a sorted array of n integers in non-decreasing order. Print the array with duplicates removed, keeping the order.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9\nThe array is given in non-decreasing order.',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The distinct values in increasing order, space-separated.',
    tags: ['arrays', 'two-pointers'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 a.erase(unique(a.begin(),a.end()),a.end());
 for(size_t i=0;i<a.size();i++)cout<<a[i]<<" \\n"[i+1==a.size()];}`,
    tests: ['6\n1 1 2 2 3 3', '4\n1 2 3 4', '3\n5 5 5', '1\n0', '7\n-3 -3 -1 0 0 0 2'],
  },
  {
    title: 'Maximum Subarray Sum',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n integers, find the largest sum obtainable from any contiguous non-empty subarray.\n\nFor example, in [-2, 1, -3, 4, -1, 2, 1, -5, 4] the best contiguous block is [4, -1, 2, 1], which sums to 6.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the maximum subarray sum.',
    tags: ['arrays', 'dynamic-programming'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long best=LLONG_MIN,cur=0;
 for(int i=0;i<n;i++){long long x;cin>>x;cur=max(x,cur+x);best=max(best,cur);}
 cout<<best<<"\\n";}`,
    tests: [
      '9\n-2 1 -3 4 -1 2 1 -5 4',
      '1\n-7',
      '5\n-1 -2 -3 -4 -5',
      '4\n1 2 3 4',
      '6\n1000000000 -1 1000000000 -1 1000000000 -1',
    ],
  },
  {
    title: 'Equilibrium Index',
    difficulty: 'MEDIUM',
    statement:
      'An equilibrium index of an array is a position where the sum of all elements strictly to its left equals the sum of all elements strictly to its right. Print the smallest 1-based equilibrium index, or -1 if there is none.\n\nAn empty side sums to 0, so the first and last positions are eligible.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The smallest 1-based equilibrium index, or -1.',
    tags: ['arrays', 'prefix-sum'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);long long tot=0;
 for(auto&x:a){cin>>x;tot+=x;}
 long long left=0;
 for(int i=0;i<n;i++){long long right=tot-left-a[i];
  if(left==right){cout<<i+1<<"\\n";return 0;}
  left+=a[i];}
 cout<<-1<<"\\n";}`,
    tests: ['5\n1 2 3 4 3', '1\n0', '4\n1 2 3 4', '3\n0 0 0', '7\n-7 1 5 2 -4 3 0'],
  },
  {
    title: 'Missing Number',
    difficulty: 'EASY',
    statement:
      'The array contains n distinct integers drawn from the range 1 to n+1, so exactly one value in that range is absent. Find it.',
    constraints: '1 <= n <= 100000\nAll values are distinct and lie between 1 and n+1.',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The missing value.',
    tags: ['arrays', 'math'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n;cin>>n;long long tot=(n+1)*(n+2)/2,s=0;
 for(long long i=0;i<n;i++){long long x;cin>>x;s+=x;}
 cout<<tot-s<<"\\n";}`,
    tests: ['4\n1 2 4 5', '1\n2', '3\n1 2 3', '5\n6 5 4 3 2', '6\n7 1 2 3 4 5'],
  },
  {
    title: 'Sort an Array',
    difficulty: 'EASY',
    statement: 'Given an array of n integers, print its elements sorted in non-decreasing order.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'n space-separated integers in non-decreasing order.',
    tags: ['arrays', 'sorting'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 sort(a.begin(),a.end());
 for(int i=0;i<n;i++)cout<<a[i]<<" \\n"[i==n-1];}`,
    tests: ['5\n5 3 1 4 2', '1\n0', '4\n-1 -2 -3 -4', '3\n7 7 7', '6\n1000000000 -1000000000 0 5 -5 1'],
  },
  {
    title: 'Kth Smallest Element',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n integers and a number k, print the kth smallest element. Duplicates count separately, so in [3, 1, 1, 2] the 2nd smallest is 1.',
    constraints: '1 <= k <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: 'The first line contains two integers n and k. The second line contains n space-separated integers.',
    outputFormat: 'The kth smallest element.',
    tags: ['arrays', 'sorting'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;
 nth_element(a.begin(),a.begin()+(k-1),a.end());
 cout<<a[k-1]<<"\\n";}`,
    tests: ['5 2\n5 3 1 4 2', '4 2\n3 1 1 2', '1 1\n9', '6 6\n1 2 3 4 5 6', '5 1\n-1 -2 -3 -4 -5'],
  },
  {
    title: 'Pair with Given Sum',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n integers and a target sum s, decide whether some two distinct positions hold values adding up to s. Print YES or NO.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9\n-2*10^9 <= s <= 2*10^9',
    inputFormat: 'The first line contains two integers n and s. The second line contains n space-separated integers.',
    outputFormat: 'YES if such a pair exists, otherwise NO.',
    tags: ['arrays', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 long long n,s;cin>>n>>s;unordered_set<long long>seen;
 for(long long i=0;i<n;i++){long long x;cin>>x;
  if(seen.count(s-x)){cout<<"YES\\n";return 0;}
  seen.insert(x);}
 cout<<"NO\\n";}`,
    tests: ['5 9\n2 7 11 15 1', '4 100\n1 2 3 4', '2 0\n-5 5', '1 5\n5', '6 -3\n-1 -2 4 8 -5 2'],
  },
  {
    title: 'Majority Element',
    difficulty: 'MEDIUM',
    statement:
      'An element is a majority element if it occurs strictly more than n/2 times. Given an array of n integers, print the majority element, or -1 if none exists.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'The majority element, or -1.',
    tags: ['arrays', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 long long cand=0,cnt=0;
 for(auto x:a){if(cnt==0){cand=x;cnt=1;}else cnt+=(x==cand)?1:-1;}
 long long c=count(a.begin(),a.end(),cand);
 cout<<(c*2>n?cand:-1)<<"\\n";}`,
    tests: ['5\n3 3 4 2 3', '4\n1 2 3 4', '1\n7', '6\n2 2 2 2 1 3', '3\n-1 -1 -1'],
  },
  {
    title: 'Product of Array Except Self',
    difficulty: 'HARD',
    statement:
      'Given an array of n integers, print an array in which position i holds the product of every element except a[i]. Because the products can be enormous, print each value modulo 1000000007.\n\nWatch out for zeros — division is not available under a modulus unless the divisor is invertible, so build the answer from prefix and suffix products instead.',
    constraints: '1 <= n <= 100000\n-1000 <= a[i] <= 1000',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'n space-separated integers, each taken modulo 1000000007.',
    tags: ['arrays', 'prefix-sum', 'math'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
const long long M=1000000007LL;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 vector<long long>pre(n+1,1),suf(n+2,1);
 for(int i=0;i<n;i++)pre[i+1]=pre[i]*((a[i]%M+M)%M)%M;
 for(int i=n-1;i>=0;i--)suf[i]=suf[i+1]*((a[i]%M+M)%M)%M;
 for(int i=0;i<n;i++)cout<<pre[i]*suf[i+1]%M<<" \\n"[i==n-1];}`,
    tests: ['4\n1 2 3 4', '3\n0 1 2', '3\n0 0 5', '1\n7', '5\n-1 2 -3 4 -5'],
  },
  {
    title: 'Merge Two Sorted Arrays',
    difficulty: 'EASY',
    statement:
      'You are given two arrays that are each already sorted in non-decreasing order. Merge them into a single sorted array and print it.',
    constraints: '1 <= n, m <= 100000\n-10^9 <= values <= 10^9\nBoth arrays are given in non-decreasing order.',
    inputFormat:
      'The first line contains two integers n and m. The second line contains n integers. The third line contains m integers.',
    outputFormat: 'n + m space-separated integers in non-decreasing order.',
    tags: ['arrays', 'two-pointers', 'sorting'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n,m;cin>>n>>m;vector<long long>a(n),b(m),r;
 for(auto&x:a)cin>>x;for(auto&x:b)cin>>x;
 r.resize(n+m);merge(a.begin(),a.end(),b.begin(),b.end(),r.begin());
 for(size_t i=0;i<r.size();i++)cout<<r[i]<<" \\n"[i+1==r.size()];}`,
    tests: [
      '3 3\n1 3 5\n2 4 6',
      '1 1\n5\n5',
      '2 3\n-5 -1\n-4 -3 -2',
      '4 1\n1 2 3 4\n0',
      '3 3\n1000000000 1000000000 1000000000\n-1000000000 0 1',
    ],
  },
  {
    title: 'Longest Consecutive Run',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n integers, find the length of the longest run of equal values appearing next to each other.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the length of the longest run.',
    tags: ['arrays', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;long long prev=0;int best=0,cur=0;
 for(int i=0;i<n;i++){long long x;cin>>x;
  if(i&&x==prev)cur++;else cur=1;
  prev=x;best=max(best,cur);}
 cout<<best<<"\\n";}`,
    tests: ['7\n1 1 2 2 2 3 3', '1\n5', '4\n1 2 3 4', '5\n9 9 9 9 9', '6\n-1 -1 0 -1 -1 -1'],
  },
  {
    title: 'Frequency of Each Element',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n integers, print each distinct value together with how many times it occurs, in increasing order of value.',
    constraints: '1 <= n <= 100000\n-10^9 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'One line per distinct value: the value, a space, then its count. Values in increasing order.',
    tags: ['arrays', 'hashing', 'sorting'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;map<long long,long long>f;
 for(int i=0;i<n;i++){long long x;cin>>x;f[x]++;}
 for(auto&[k,v]:f)cout<<k<<" "<<v<<"\\n";}`,
    tests: ['6\n1 2 2 3 3 3', '1\n7', '4\n-1 -1 -1 -1', '5\n5 4 3 2 1', '5\n0 -1 1 -1 0'],
  },
  {
    title: 'Trapping Rain Water',
    difficulty: 'HARD',
    statement:
      'An array of n non-negative integers describes an elevation map where each bar has width 1. After it rains, water settles in the dips. Compute how many units of water are trapped.\n\nWater above position i is limited by the tallest bar to its left and the tallest to its right — specifically by the smaller of those two, minus the height at i.',
    constraints: '1 <= n <= 100000\n0 <= a[i] <= 10^9',
    inputFormat: INT_ARRAY_IN,
    outputFormat: 'A single integer — the total units of trapped water.',
    tags: ['arrays', 'two-pointers'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
 int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
 long long l=0,r=n-1,lm=0,rm=0,res=0;
 while(l<r){if(a[l]<a[r]){lm=max(lm,a[l]);res+=lm-a[l];l++;}
  else{rm=max(rm,a[r]);res+=rm-a[r];r--;}}
 cout<<res<<"\\n";}`,
    tests: [
      '12\n0 1 0 2 1 0 1 3 2 1 2 1',
      '1\n5',
      '5\n5 4 3 2 1',
      '6\n4 2 0 3 2 5',
      '3\n1000000000 0 1000000000',
    ],
  },
];
