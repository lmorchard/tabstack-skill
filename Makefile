SKILL_NAME := tabstack
SKILL_FILES := SKILL.md references/

# Where `make install` drops the skill. Override for your runtime, e.g.
# `make install SKILLS_DIR=~/.claude/skills`.
SKILLS_DIR ?= $(HOME)/.openclaw/workspace/skills

validate:
	@python3 validate_skill.py .

package: validate
	rm -f $(SKILL_NAME).skill
	zip -r $(SKILL_NAME).skill $(SKILL_FILES) -x "node_modules/*"

install: package
	mkdir -p $(SKILLS_DIR)/$(SKILL_NAME)
	unzip -o $(SKILL_NAME).skill -d $(SKILLS_DIR)/$(SKILL_NAME)/
