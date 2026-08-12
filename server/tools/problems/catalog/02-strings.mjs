/** String processing. See 01-arrays.mjs for the entry format. */
const ONE_LINE = 'A single line containing the string s.';

export default [
  {
    title: 'String Length',
    difficulty: 'EASY',
    statement: 'Given a string of lowercase letters, print how many characters it contains.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'A single integer — the length of s.',
    tags: ['strings', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;cout<<s.size()<<"\\n";}`,
    tests: ['hello', 'a', 'abcdefghij', 'zzzzzzzzzzzzzzzzzzzz', 'codeforge'],
  },
  {
    title: 'Convert to Uppercase',
    difficulty: 'EASY',
    statement: 'Given a string of lowercase letters, print it converted to uppercase.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'The string in uppercase.',
    tags: ['strings', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;for(auto&c:s)c=toupper(c);cout<<s<<"\\n";}`,
    tests: ['hello', 'a', 'codeforge', 'abcxyz', 'programming'],
  },
  {
    title: 'Count Character Occurrences',
    difficulty: 'EASY',
    statement: 'Given a string s and a character c, count how many times c appears in s.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters, and c is a lowercase letter.',
    inputFormat: 'The first line contains the string s. The second line contains the single character c.',
    outputFormat: 'A single integer — the number of occurrences.',
    tags: ['strings', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;char c;cin>>s>>c;cout<<count(s.begin(),s.end(),c)<<"\\n";}`,
    tests: ['banana\na', 'hello\nz', 'aaaa\na', 'abcdef\nf', 'mississippi\ns'],
  },
  {
    title: 'Remove Duplicate Characters',
    difficulty: 'EASY',
    statement:
      'Given a string of lowercase letters, print it with every repeated character removed, keeping only the first appearance of each and preserving the original order.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'The string with duplicate characters removed.',
    tags: ['strings', 'hashing'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s,r;cin>>s;bool seen[26]={false};
 for(char c:s){if(!seen[c-'a']){seen[c-'a']=true;r+=c;}}
 cout<<r<<"\\n";}`,
    tests: ['banana', 'abcdef', 'aaaa', 'mississippi', 'zyxzyx'],
  },
  {
    title: 'Check Anagram',
    difficulty: 'EASY',
    statement:
      'Two strings are anagrams when one can be rearranged into the other, using exactly the same letters the same number of times. Given two strings, print YES if they are anagrams and NO otherwise.',
    constraints: '1 <= |a|, |b| <= 100000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'YES or NO.',
    tags: ['strings', 'hashing', 'sorting'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 if(a.size()!=b.size()){cout<<"NO\\n";return 0;}
 sort(a.begin(),a.end());sort(b.begin(),b.end());
 cout<<(a==b?"YES":"NO")<<"\\n";}`,
    tests: ['listen\nsilent', 'hello\nworld', 'a\na', 'abc\nabcd', 'aabbcc\nbbaacc'],
  },
  {
    title: 'Reverse Words in a Sentence',
    difficulty: 'MEDIUM',
    statement:
      'Given a sentence made of words separated by single spaces, print the words in reverse order, still separated by single spaces.',
    constraints: '1 <= number of words <= 10000\nEach word consists of lowercase English letters, length at most 20.',
    inputFormat: 'A single line containing the sentence.',
    outputFormat: 'The words in reverse order, separated by single spaces.',
    tags: ['strings', 'implementation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);
 vector<string>w;stringstream ss(line);string t;
 while(ss>>t)w.push_back(t);
 for(int i=w.size()-1;i>=0;i--)cout<<w[i]<<" \\n"[i==0];}`,
    tests: ['the quick brown fox', 'hello', 'a b c d e', 'coding is fun today', 'one two'],
  },
  {
    title: 'First Non-Repeating Character',
    difficulty: 'MEDIUM',
    statement:
      'Given a string of lowercase letters, print the first character that appears exactly once. If every character repeats, print -1.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'The first non-repeating character, or -1.',
    tags: ['strings', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int f[26]={0};
 for(char c:s)f[c-'a']++;
 for(char c:s)if(f[c-'a']==1){cout<<c<<"\\n";return 0;}
 cout<<-1<<"\\n";}`,
    tests: ['swiss', 'aabb', 'abcabc', 'z', 'aabbccddeef'],
  },
  {
    title: 'Longest Word in a Sentence',
    difficulty: 'EASY',
    statement:
      'Given a sentence of words separated by single spaces, print the longest word. If several words tie for the longest, print the one that appears first.',
    constraints: '1 <= number of words <= 10000\nEach word consists of lowercase English letters, length at most 20.',
    inputFormat: 'A single line containing the sentence.',
    outputFormat: 'The longest word.',
    tags: ['strings', 'implementation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);
 stringstream ss(line);string t,best;
 while(ss>>t)if(t.size()>best.size())best=t;
 cout<<best<<"\\n";}`,
    tests: ['the quick brown fox', 'hello', 'aa bb cc', 'short longer longest', 'one three two'],
  },
  {
    title: 'Palindrome Sentence',
    difficulty: 'MEDIUM',
    statement:
      'A string reads as a palindrome if it is the same forwards and backwards once you ignore everything that is not a letter or digit and treat uppercase and lowercase as equal. Given a line of text, print YES if it is a palindrome under those rules, otherwise NO.',
    constraints: '1 <= |s| <= 100000\ns contains printable ASCII characters and may include spaces.',
    inputFormat: 'A single line of text.',
    outputFormat: 'YES or NO.',
    tags: ['strings', 'two-pointers'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);string t;
 for(char c:line)if(isalnum((unsigned char)c))t+=tolower(c);
 string r=t;reverse(r.begin(),r.end());
 cout<<(t==r?"YES":"NO")<<"\\n";}`,
    tests: [
      'A man a plan a canal Panama',
      'hello world',
      'racecar',
      'No lemon, no melon',
      'ab',
    ],
  },
  {
    title: 'Count Words',
    difficulty: 'EASY',
    statement:
      'Given a line of text containing words separated by one or more spaces, count how many words it contains.',
    constraints: '1 <= |s| <= 100000',
    inputFormat: 'A single line of text.',
    outputFormat: 'A single integer — the number of words.',
    tags: ['strings', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);
 stringstream ss(line);string t;int c=0;
 while(ss>>t)c++;
 cout<<c<<"\\n";}`,
    tests: ['the quick brown fox', 'hello', 'a  b   c', 'one two three four five', 'word'],
  },
  {
    title: 'String Compression',
    difficulty: 'MEDIUM',
    statement:
      'Compress a string by replacing each run of the same character with that character followed by the run length. For example aaabbc becomes a3b2c1. Print the compressed form even when it is longer than the original.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'The compressed string.',
    tags: ['strings', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;string r;
 for(size_t i=0;i<s.size();){size_t j=i;while(j<s.size()&&s[j]==s[i])j++;
  r+=s[i];r+=to_string(j-i);i=j;}
 cout<<r<<"\\n";}`,
    tests: ['aaabbc', 'abcdef', 'a', 'zzzzzzzzzz', 'aabbaabb'],
  },
  {
    title: 'Substring Search',
    difficulty: 'MEDIUM',
    statement:
      'Given a text string s and a pattern p, print the 1-based index where p first occurs inside s, or -1 if it does not occur at all.',
    constraints: '1 <= |p| <= |s| <= 100000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'The first line contains s. The second line contains p.',
    outputFormat: 'The 1-based starting index of the first occurrence, or -1.',
    tags: ['strings', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s,p;cin>>s>>p;
 auto pos=s.find(p);
 cout<<(pos==string::npos?-1:(long long)pos+1)<<"\\n";}`,
    tests: ['ababcabc\nabc', 'hello\nxyz', 'aaaa\naa', 'abcdef\nf', 'mississippi\nissip'],
  },
  {
    title: 'Vowel and Consonant Count',
    difficulty: 'EASY',
    statement: 'Given a string of lowercase letters, print how many vowels and how many consonants it contains.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'Two space-separated integers: the vowel count followed by the consonant count.',
    tags: ['strings', 'basics'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int v=0,c=0;
 for(char ch:s){if(ch=='a'||ch=='e'||ch=='i'||ch=='o'||ch=='u')v++;else c++;}
 cout<<v<<" "<<c<<"\\n";}`,
    tests: ['programming', 'aeiou', 'xyz', 'a', 'codeforge'],
  },
  {
    title: 'Capitalize Each Word',
    difficulty: 'EASY',
    statement:
      'Given a sentence of lowercase words separated by single spaces, print it with the first letter of every word capitalised.',
    constraints: '1 <= number of words <= 10000\nEach word consists of lowercase English letters, length at most 20.',
    inputFormat: 'A single line containing the sentence.',
    outputFormat: 'The sentence with each word capitalised.',
    tags: ['strings', 'implementation'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);
 bool start=true;
 for(auto&c:line){if(c==' '){start=true;continue;}
  if(start){c=toupper(c);start=false;}}
 cout<<line<<"\\n";}`,
    tests: ['the quick brown fox', 'hello', 'a b c', 'coding ninjas rock', 'one'],
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'HARD',
    statement:
      'Given a string of lowercase letters, find the length of the longest contiguous block in which no character repeats.\n\nA sliding window works well here: extend the right edge, and whenever a repeat appears, pull the left edge past the previous occurrence of that character.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'A single integer — the length of the longest such block.',
    tags: ['strings', 'two-pointers', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;
 vector<int>last(26,-1);int best=0,l=0;
 for(int r=0;r<(int)s.size();r++){int c=s[r]-'a';
  if(last[c]>=l)l=last[c]+1;
  last[c]=r;best=max(best,r-l+1);}
 cout<<best<<"\\n";}`,
    tests: ['abcabcbb', 'bbbbb', 'pwwkew', 'abcdefghij', 'a'],
  },
  {
    title: 'Valid Parentheses',
    difficulty: 'MEDIUM',
    statement:
      'A bracket string is balanced when every opening bracket is closed by the matching kind in the right order. Given a string made of the characters ()[]{}, print YES if it is balanced and NO otherwise.',
    constraints: '1 <= |s| <= 100000\ns consists only of the characters ( ) [ ] { }',
    inputFormat: ONE_LINE,
    outputFormat: 'YES or NO.',
    tags: ['strings', 'stack'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;vector<char>st;
 auto match=[](char a,char b){return (a=='('&&b==')')||(a=='['&&b==']')||(a=='{'&&b=='}');};
 for(char c:s){
  if(c=='('||c=='['||c=='{')st.push_back(c);
  else{if(st.empty()||!match(st.back(),c)){cout<<"NO\\n";return 0;}st.pop_back();}}
 cout<<(st.empty()?"YES":"NO")<<"\\n";}`,
    tests: ['()[]{}', '(]', '{[()]}', '(((', '([)]'],
  },
  {
    title: 'Count Distinct Characters',
    difficulty: 'EASY',
    statement: 'Given a string of lowercase letters, count how many distinct characters it uses.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'A single integer — the number of distinct characters.',
    tags: ['strings', 'hashing'],
    visible: 2,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;set<char>d(s.begin(),s.end());cout<<d.size()<<"\\n";}`,
    tests: ['banana', 'abcdef', 'aaaa', 'mississippi', 'z'],
  },
  {
    title: 'Run Length Decoding',
    difficulty: 'MEDIUM',
    statement:
      'A string has been encoded as a sequence of a letter followed by a count, for example a3b2 meaning aaabb. Given such an encoding, print the original string.',
    constraints:
      'The encoded string has length at most 2000.\nEach count is between 1 and 50 and every letter is lowercase.',
    inputFormat: 'A single line containing the encoded string.',
    outputFormat: 'The decoded string.',
    tags: ['strings', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;string r;
 for(size_t i=0;i<s.size();){char c=s[i++];int n=0;
  while(i<s.size()&&isdigit((unsigned char)s[i]))n=n*10+(s[i++]-'0');
  r.append(n,c);}
 cout<<r<<"\\n";}`,
    tests: ['a3b2', 'z1', 'a10', 'x2y3z4', 'q50'],
  },
  {
    title: 'Rotate String Check',
    difficulty: 'MEDIUM',
    statement:
      'Given two strings a and b, decide whether b can be obtained by rotating a. Rotating means moving some number of characters from the front to the back, so abcde rotated by 2 gives cdeab. Print YES or NO.',
    constraints: '1 <= |a|, |b| <= 100000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'YES or NO.',
    tags: ['strings', 'implementation'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 if(a.size()!=b.size()){cout<<"NO\\n";return 0;}
 string d=a+a;
 cout<<(d.find(b)!=string::npos?"YES":"NO")<<"\\n";}`,
    tests: ['abcde\ncdeab', 'abc\nacb', 'aaaa\naaaa', 'abcd\nabcde', 'rotation\ntionrota'],
  },
  {
    title: 'Character Frequency Sort',
    difficulty: 'HARD',
    statement:
      'Given a string of lowercase letters, print its characters sorted by how often they occur, most frequent first. Characters that occur equally often must appear in alphabetical order relative to one another, and each character is printed as many times as it occurs.',
    constraints: '1 <= |s| <= 100000\ns consists of lowercase English letters.',
    inputFormat: ONE_LINE,
    outputFormat: 'The rearranged string.',
    tags: ['strings', 'sorting', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int f[26]={0};
 for(char c:s)f[c-'a']++;
 vector<pair<int,char>>v;
 for(int i=0;i<26;i++)if(f[i])v.push_back({f[i],(char)('a'+i)});
 sort(v.begin(),v.end(),[](auto&x,auto&y){
  if(x.first!=y.first)return x.first>y.first;
  return x.second<y.second;});
 string r;for(auto&[cnt,c]:v)r.append(cnt,c);
 cout<<r<<"\\n";}`,
    tests: ['tree', 'cccaaa', 'abcabc', 'z', 'mississippi'],
  },
  {
    title: 'Longest Common Substring Length',
    difficulty: 'HARD',
    statement:
      'Given two strings, find the length of the longest contiguous block of characters that appears in both.\n\nNote that this asks for a *substring* (contiguous), not a subsequence.',
    constraints: '1 <= |a|, |b| <= 1000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'A single integer — the length of the longest common substring.',
    tags: ['strings', 'dynamic-programming'],
    visible: 1,
    timeLimit: 2000,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 int n=a.size(),m=b.size(),best=0;
 vector<vector<int>>dp(n+1,vector<int>(m+1,0));
 for(int i=1;i<=n;i++)for(int j=1;j<=m;j++)
  if(a[i-1]==b[j-1]){dp[i][j]=dp[i-1][j-1]+1;best=max(best,dp[i][j]);}
 cout<<best<<"\\n";}`,
    tests: ['abcdef\nzabcy', 'abc\nxyz', 'aaaa\naa', 'programming\ngaming', 'a\na'],
  },
  {
    title: 'Isomorphic Strings',
    difficulty: 'MEDIUM',
    statement:
      'Two strings are isomorphic when the characters of the first can be consistently replaced to produce the second: every occurrence of a given character must map to the same character, and no two different characters may map to the same one. Print YES or NO.',
    constraints: '1 <= |a|, |b| <= 100000\nBoth strings consist of lowercase English letters.',
    inputFormat: 'Two lines, each containing one string.',
    outputFormat: 'YES or NO.',
    tags: ['strings', 'hashing'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string a,b;cin>>a>>b;
 if(a.size()!=b.size()){cout<<"NO\\n";return 0;}
 vector<int>f(26,-1),g(26,-1);
 for(size_t i=0;i<a.size();i++){int x=a[i]-'a',y=b[i]-'a';
  if(f[x]==-1&&g[y]==-1){f[x]=y;g[y]=x;}
  else if(f[x]!=y||g[y]!=x){cout<<"NO\\n";return 0;}}
 cout<<"YES\\n";}`,
    tests: ['egg\nadd', 'foo\nbar', 'paper\ntitle', 'ab\naa', 'abcd\nabcd'],
  },
  {
    title: 'Word Frequency Report',
    difficulty: 'MEDIUM',
    statement:
      'Given a line of lowercase words separated by single spaces, print each distinct word with the number of times it appears, ordered alphabetically.',
    constraints: '1 <= number of words <= 10000\nEach word consists of lowercase English letters, length at most 20.',
    inputFormat: 'A single line containing the sentence.',
    outputFormat: 'One line per distinct word: the word, a space, then its count, in alphabetical order.',
    tags: ['strings', 'hashing', 'sorting'],
    visible: 1,
    solution: `#include <bits/stdc++.h>
using namespace std;
int main(){string line;getline(cin,line);
 stringstream ss(line);string t;map<string,int>f;
 while(ss>>t)f[t]++;
 for(auto&[k,v]:f)cout<<k<<" "<<v<<"\\n";}`,
    tests: [
      'the cat and the hat',
      'hello',
      'a a a b b c',
      'one two three two one one',
      'zebra apple mango apple',
    ],
  },
];
