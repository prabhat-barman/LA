import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { SubHeader } from '../../components/molecules/SubHeader';
import { CaretDownIcon } from '../../components/atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export const FAQScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categories = ['General', 'AI Scoring', 'Results', 'Economics'];

  const faqs: FAQItem[] = [
    {
      id: 1,
      category: 'General',
      question: 'How do I start practicing on the dashboard?',
      answer:
        'Select your desired section (Speaking, Writing, Reading, or Listening) from the category selector tabs, configure your sub-option preferences, and click on any practice material item to launch.',
    },
    {
      id: 2,
      category: 'General',
      question: 'How do I choose between practice & mock tests?',
      answer:
        'Practice mode is ideal for targeted improvement of specific skills and reviewing template details. Mock Tests simulate the actual timed exam environment to assess overall exam readiness.',
    },
    {
      id: 3,
      category: 'General',
      question: 'What is the recommended daily workflow?',
      answer:
        'We recommend spending 30-40 minutes on targeted Speaking and Listening exercises daily, completing 1 mock test per week, and thoroughly reviewing AI feedback report suggestions.',
    },
    {
      id: 4,
      category: 'AI Scoring',
      question: 'How accurate is the AI scoring engine?',
      answer:
        'Our AI scoring engine is highly calibrated to match official grading rubrics, achieving over 95% correlation with human test evaluators across pronunciation, fluency, grammar, and vocabulary.',
    },
    {
      id: 5,
      category: 'Results',
      question: 'When will I receive my Mock Test results?',
      answer:
        'Mock Test grading is fully automated. Your score card, target evaluations, and detailed speech analytics are generated instantly within 2-5 minutes of submitting the test.',
    },
    {
      id: 6,
      category: 'Economics',
      question: 'Are there promotional discounts for extension packages?',
      answer:
        'Yes! Multi-month packages automatically offer up to 40% savings. We also run seasonal discounts which will be notified via the Promotional settings feed.',
    },
  ];

  const handleToggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <SubHeader title="FAQs" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search keywords..."
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, selectedCategory === cat && styles.pillActive]}
              onPress={() => {
                setSelectedCategory(cat);
                setExpandedId(null);
              }}
            >
              <Text style={[styles.pillText, selectedCategory === cat && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Accordion list */}
        <View style={styles.listContainer}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.questionRow}
                    onPress={() => handleToggle(item.id)}
                  >
                    <Text style={styles.questionText}>{item.question}</Text>
                    <CaretDownIcon size={scale(14)} color="#8E8E93" expanded={isExpanded} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No FAQs found for this filter query.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  scrollContent: {
    paddingBottom: scale(30),
  },
  searchContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(16),
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: scale(13),
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  categoryPillsContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  pill: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    marginRight: scale(8),
  },
  pillActive: {
    backgroundColor: '#94C23C',
    borderColor: '#94C23C',
  },
  pillText: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(4),
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: '#EAECEF',
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
  },
  questionText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    flex: 1,
    marginRight: scale(12),
  },
  answerContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    borderTopWidth: 0.5,
    borderTopColor: '#F2F2F7',
    paddingTop: scale(12),
  },
  answerText: {
    fontSize: scale(12),
    color: '#4F5E7B',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(18),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  emptyText: {
    fontSize: scale(13),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Regular',
  },
});
