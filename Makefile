SKILL_NAME := tabstack
SKILL_FILES := SKILL.md references/

validate:
	@python3 validate_skill.py .

package: validate
	rm -f $(SKILL_NAME).skill
	zip -r $(SKILL_NAME).skill $(SKILL_FILES) -x "node_modules/*"

install: package
	mkdir -p ~/.openclaw/workspace/skills/$(SKILL_NAME)
	unzip -o $(SKILL_NAME).skill -d ~/.openclaw/workspace/skills/$(SKILL_NAME)/
